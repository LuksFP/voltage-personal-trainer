import type {
  AlimentoBanco,
  CategoriaAlimento,
  UnidadeMedidaAlimento,
} from "./types";

export const CATEGORIAS_ALIMENTO: { value: CategoriaAlimento; label: string }[] = [
  { value: "proteina", label: "Proteína" },
  { value: "carboidrato", label: "Carboidrato" },
  { value: "gordura", label: "Gordura" },
  { value: "fruta", label: "Fruta" },
  { value: "vegetal", label: "Vegetal" },
  { value: "laticinio", label: "Laticínio" },
  { value: "bebida", label: "Bebida" },
  { value: "suplemento", label: "Suplemento" },
  { value: "outro", label: "Outro" },
];

export const UNIDADES_ALIMENTO: { value: UnidadeMedidaAlimento; label: string }[] = [
  { value: "g", label: "gramas (g)" },
  { value: "ml", label: "mililitros (ml)" },
  { value: "unidade", label: "unidade" },
];

const ROTULO_CATEGORIA = new Map(CATEGORIAS_ALIMENTO.map((c) => [c.value, c.label]));

export function rotuloCategoria(categoria: CategoriaAlimento): string {
  return ROTULO_CATEGORIA.get(categoria) ?? "Outro";
}

// Base de referência padrão por unidade: 100 g/ml, 1 unidade.
export function baseParaUnidade(unidade: UnidadeMedidaAlimento): number {
  return unidade === "unidade" ? 1 : 100;
}

// Sufixo curto para exibir a quantidade (ex.: "150 g", "2 un").
export function sufixoUnidade(unidade: UnidadeMedidaAlimento): string {
  if (unidade === "unidade") return "un";
  return unidade;
}

export interface CriarAlimentoBancoInput {
  nome: string;
  categoria: CategoriaAlimento;
  unidade: UnidadeMedidaAlimento;
  base: number;
  kcal: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  marca?: string;
}

function numeroNaoNegativo(valor: number, maximo: number): number {
  if (!Number.isFinite(valor) || valor < 0) return 0;
  return Math.min(Math.round(valor * 10) / 10, maximo);
}

export function normalizarAlimentoBancoInput(
  input: CriarAlimentoBancoInput,
): Omit<AlimentoBanco, "id" | "criadoEm"> {
  const nome = input.nome.trim();
  if (!nome) throw new Error("Informe o nome do alimento.");

  const base = input.base > 0 && Number.isFinite(input.base) ? input.base : baseParaUnidade(input.unidade);

  const alimento: Omit<AlimentoBanco, "id" | "criadoEm"> = {
    nome,
    categoria: input.categoria,
    unidade: input.unidade,
    base: Math.min(Math.round(base * 10) / 10, 10000),
    kcal: numeroNaoNegativo(input.kcal, 100000),
    proteinas: numeroNaoNegativo(input.proteinas, 10000),
    carboidratos: numeroNaoNegativo(input.carboidratos, 10000),
    gorduras: numeroNaoNegativo(input.gorduras, 10000),
  };
  const marca = input.marca?.trim();
  if (marca) alimento.marca = marca;
  return alimento;
}

export function ordenarAlimentosBanco(alimentos: readonly AlimentoBanco[]): AlimentoBanco[] {
  return [...alimentos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function buscarAlimentos(
  alimentos: readonly AlimentoBanco[],
  termo: string,
): AlimentoBanco[] {
  const t = normalizar(termo.trim());
  const base = ordenarAlimentosBanco(alimentos);
  if (!t) return base;
  return base.filter(
    (a) => normalizar(a.nome).includes(t) || normalizar(a.marca ?? "").includes(t),
  );
}
