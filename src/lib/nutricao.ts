import type {
  AlimentoBanco,
  AlimentoRefeicao,
  CategoriaAlimento,
  MacrosCalculados,
  MetasMacros,
  PlanoAlimentar,
  RefeicaoPlano,
  UnidadeMedidaAlimento,
} from "./types";

// Calorias por grama de cada macronutriente (padrão Atwater).
const KCAL_POR_GRAMA = { proteinas: 4, carboidratos: 4, gorduras: 9 } as const;

export interface AlimentoRefeicaoInput {
  nome: string;
  quantidade: string;
  observacao?: string;
  bancoId?: string;
  quantidadeNum?: number;
}

export interface RefeicaoPlanoInput {
  nome: string;
  horario?: string;
  alimentos: AlimentoRefeicaoInput[];
  observacao?: string;
}

export interface CriarPlanoAlimentarInput {
  titulo: string;
  objetivo?: string;
  metas: MetasMacros;
  aguaLitros?: number;
  refeicoes: RefeicaoPlanoInput[];
  observacoes?: string;
}

const HORA_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

let contadorId = 0;
// Id local estável dentro da sessão (o id definitivo dos planos vem da store via uid()).
function idLocal(prefixo: string): string {
  contadorId += 1;
  return `${prefixo}-${contadorId}`;
}

function limparNumeroMacro(valor: number | undefined, maximo: number): number | undefined {
  if (valor === undefined) return undefined;
  if (!Number.isFinite(valor) || valor <= 0) return undefined;
  return Math.min(Math.round(valor), maximo);
}

function normalizarMetas(metas: MetasMacros): MetasMacros {
  const normalizadas: MetasMacros = {};
  const calorias = limparNumeroMacro(metas.calorias, 20000);
  const proteinas = limparNumeroMacro(metas.proteinas, 2000);
  const carboidratos = limparNumeroMacro(metas.carboidratos, 2000);
  const gorduras = limparNumeroMacro(metas.gorduras, 2000);
  if (calorias !== undefined) normalizadas.calorias = calorias;
  if (proteinas !== undefined) normalizadas.proteinas = proteinas;
  if (carboidratos !== undefined) normalizadas.carboidratos = carboidratos;
  if (gorduras !== undefined) normalizadas.gorduras = gorduras;
  return normalizadas;
}

function normalizarAlimento(input: AlimentoRefeicaoInput): AlimentoRefeicao | null {
  const nome = input.nome.trim();
  if (!nome) return null;
  const alimento: AlimentoRefeicao = {
    id: idLocal("alim"),
    nome,
    quantidade: input.quantidade.trim(),
  };
  const observacao = input.observacao?.trim();
  if (observacao) alimento.observacao = observacao;
  if (
    input.bancoId &&
    input.quantidadeNum !== undefined &&
    Number.isFinite(input.quantidadeNum) &&
    input.quantidadeNum > 0
  ) {
    alimento.bancoId = input.bancoId;
    alimento.quantidadeNum = input.quantidadeNum;
  }
  return alimento;
}

function normalizarRefeicao(input: RefeicaoPlanoInput): RefeicaoPlano | null {
  const nome = input.nome.trim();
  if (!nome) return null;
  const alimentos = input.alimentos
    .map(normalizarAlimento)
    .filter((item): item is AlimentoRefeicao => item !== null);
  const refeicao: RefeicaoPlano = {
    id: idLocal("ref"),
    nome,
    alimentos,
  };
  const horario = input.horario?.trim();
  if (horario && HORA_HHMM.test(horario)) refeicao.horario = horario;
  const observacao = input.observacao?.trim();
  if (observacao) refeicao.observacao = observacao;
  return refeicao;
}

// Valida + limpa a entrada do formulário. Lança em caso de inconsistência bloqueante.
export function normalizarPlanoInput(
  input: CriarPlanoAlimentarInput,
): Omit<PlanoAlimentar, "id" | "alunoId" | "status" | "criadoEm" | "atualizadoEm"> {
  const titulo = input.titulo.trim();
  if (!titulo) throw new Error("Dê um título para o plano alimentar.");

  const refeicoes = input.refeicoes
    .map(normalizarRefeicao)
    .filter((item): item is RefeicaoPlano => item !== null);
  if (refeicoes.length === 0) {
    throw new Error("Adicione ao menos uma refeição com um alimento.");
  }

  const plano: Omit<
    PlanoAlimentar,
    "id" | "alunoId" | "status" | "criadoEm" | "atualizadoEm"
  > = {
    titulo,
    metas: normalizarMetas(input.metas),
    refeicoes,
  };

  const objetivo = input.objetivo?.trim();
  if (objetivo) plano.objetivo = objetivo;

  const agua = limparNumeroMacroDecimal(input.aguaLitros);
  if (agua !== undefined) plano.aguaLitros = agua;

  const observacoes = input.observacoes?.trim();
  if (observacoes) plano.observacoes = observacoes;

  return plano;
}

function limparNumeroMacroDecimal(valor: number | undefined): number | undefined {
  if (valor === undefined) return undefined;
  if (!Number.isFinite(valor) || valor <= 0) return undefined;
  return Math.min(Math.round(valor * 10) / 10, 20);
}

// Ativos primeiro, depois por atualização mais recente.
export function ordenarPlanos(planos: readonly PlanoAlimentar[]): PlanoAlimentar[] {
  return [...planos].sort((a, b) => {
    if (a.status !== b.status) return a.status === "ativo" ? -1 : 1;
    return b.atualizadoEm.localeCompare(a.atualizadoEm);
  });
}

export function contarAlimentos(plano: PlanoAlimentar): number {
  return plano.refeicoes.reduce((total, refeicao) => total + refeicao.alimentos.length, 0);
}

// Calorias estimadas a partir dos macros informados (proteína/carbo × 4 + gordura × 9).
export function caloriasDosMacros(metas: MetasMacros): number | null {
  if (
    metas.proteinas === undefined &&
    metas.carboidratos === undefined &&
    metas.gorduras === undefined
  ) {
    return null;
  }
  return (
    (metas.proteinas ?? 0) * KCAL_POR_GRAMA.proteinas +
    (metas.carboidratos ?? 0) * KCAL_POR_GRAMA.carboidratos +
    (metas.gorduras ?? 0) * KCAL_POR_GRAMA.gorduras
  );
}

export interface FatiaMacro {
  chave: "proteinas" | "carboidratos" | "gorduras";
  rotulo: string;
  gramas: number;
  kcal: number;
  percentual: number; // participação nas calorias dos macros
}

const ROTULOS_MACRO: Record<FatiaMacro["chave"], string> = {
  proteinas: "Proteínas",
  carboidratos: "Carboidratos",
  gorduras: "Gorduras",
};

// Distribuição percentual dos macros no total calórico deles (para a barra empilhada).
export function distribuicaoMacros(metas: MetasMacros): FatiaMacro[] {
  const totalKcal = caloriasDosMacros(metas);
  if (totalKcal === null || totalKcal === 0) return [];
  const chaves: FatiaMacro["chave"][] = ["proteinas", "carboidratos", "gorduras"];
  return chaves
    .map((chave) => {
      const gramas = metas[chave] ?? 0;
      const kcal = gramas * KCAL_POR_GRAMA[chave];
      return {
        chave,
        rotulo: ROTULOS_MACRO[chave],
        gramas,
        kcal,
        percentual: totalKcal > 0 ? Math.round((kcal / totalKcal) * 100) : 0,
      };
    })
    .filter((fatia) => fatia.gramas > 0);
}

// Se o personal preencheu calorias E macros, sinaliza divergência grande (>15%).
export function divergenciaCalorias(metas: MetasMacros): number | null {
  const dosMacros = caloriasDosMacros(metas);
  if (dosMacros === null || metas.calorias === undefined || metas.calorias === 0) {
    return null;
  }
  return Math.round(((dosMacros - metas.calorias) / metas.calorias) * 100);
}

export function temMetasDefinidas(metas: MetasMacros): boolean {
  return (
    metas.calorias !== undefined ||
    metas.proteinas !== undefined ||
    metas.carboidratos !== undefined ||
    metas.gorduras !== undefined
  );
}

// ── Cálculo automático a partir do banco de alimentos ───────────────────────

export const MACROS_ZERO: MacrosCalculados = {
  kcal: 0,
  proteinas: 0,
  carboidratos: 0,
  gorduras: 0,
};

function arredondar1(valor: number): number {
  return Math.round(valor * 10) / 10;
}

export function somarMacros(a: MacrosCalculados, b: MacrosCalculados): MacrosCalculados {
  return {
    kcal: a.kcal + b.kcal,
    proteinas: a.proteinas + b.proteinas,
    carboidratos: a.carboidratos + b.carboidratos,
    gorduras: a.gorduras + b.gorduras,
  };
}

function arredondarMacros(macros: MacrosCalculados): MacrosCalculados {
  return {
    kcal: Math.round(macros.kcal),
    proteinas: arredondar1(macros.proteinas),
    carboidratos: arredondar1(macros.carboidratos),
    gorduras: arredondar1(macros.gorduras),
  };
}

// Macros de um item de refeição, se estiver vinculado ao banco. null quando avulso.
export function macrosDoItem(
  item: AlimentoRefeicao,
  bancoPorId: Map<string, AlimentoBanco>,
): MacrosCalculados | null {
  if (!item.bancoId || item.quantidadeNum === undefined) return null;
  const alimento = bancoPorId.get(item.bancoId);
  if (!alimento || alimento.base <= 0) return null;
  const fator = item.quantidadeNum / alimento.base;
  return {
    kcal: alimento.kcal * fator,
    proteinas: alimento.proteinas * fator,
    carboidratos: alimento.carboidratos * fator,
    gorduras: alimento.gorduras * fator,
  };
}

export function indexarBanco(banco: readonly AlimentoBanco[]): Map<string, AlimentoBanco> {
  return new Map(banco.map((alimento) => [alimento.id, alimento]));
}

export interface TotaisCalculados {
  macros: MacrosCalculados;
  itensCalculados: number; // itens que contribuíram para o cálculo
  itensAvulsos: number; // itens sem vínculo (não somam)
}

export function totaisDaRefeicao(
  refeicao: RefeicaoPlano,
  bancoPorId: Map<string, AlimentoBanco>,
): TotaisCalculados {
  let macros = MACROS_ZERO;
  let itensCalculados = 0;
  let itensAvulsos = 0;
  for (const item of refeicao.alimentos) {
    const parcial = macrosDoItem(item, bancoPorId);
    if (parcial) {
      macros = somarMacros(macros, parcial);
      itensCalculados += 1;
    } else {
      itensAvulsos += 1;
    }
  }
  return { macros: arredondarMacros(macros), itensCalculados, itensAvulsos };
}

export function totaisDoPlano(
  plano: PlanoAlimentar,
  banco: readonly AlimentoBanco[],
): TotaisCalculados {
  const bancoPorId = indexarBanco(banco);
  let macros = MACROS_ZERO;
  let itensCalculados = 0;
  let itensAvulsos = 0;
  for (const refeicao of plano.refeicoes) {
    const totalRef = totaisDaRefeicao(refeicao, bancoPorId);
    macros = somarMacros(macros, totalRef.macros);
    itensCalculados += totalRef.itensCalculados;
    itensAvulsos += totalRef.itensAvulsos;
  }
  return { macros: arredondarMacros(macros), itensCalculados, itensAvulsos };
}

// Distribuição percentual dos macros calculados (para barra empilhada).
export function distribuicaoDeMacros(macros: MacrosCalculados): FatiaMacro[] {
  return distribuicaoMacros({
    proteinas: macros.proteinas || undefined,
    carboidratos: macros.carboidratos || undefined,
    gorduras: macros.gorduras || undefined,
  });
}

// ── Plano montado × meta ────────────────────────────────────────────────────
// Compara o total calculado do plano (alimentos vinculados) com a meta definida,
// por macro. `percentual` só existe quando há meta > 0.

export type ChaveComparacao = "kcal" | "proteinas" | "carboidratos" | "gorduras";

export interface ComparacaoMacro {
  chave: ChaveComparacao;
  rotulo: string;
  unidade: string;
  planejado: number;
  meta?: number;
  percentual?: number; // planejado / meta × 100
}

export function compararPlanoComMeta(
  plano: PlanoAlimentar,
  banco: readonly AlimentoBanco[],
): { linhas: ComparacaoMacro[]; temMeta: boolean; itensCalculados: number } {
  const totais = totaisDoPlano(plano, banco);
  const p = totais.macros;
  const m = plano.metas;
  const base: Omit<ComparacaoMacro, "percentual">[] = [
    { chave: "kcal", rotulo: "Calorias", unidade: "kcal", planejado: p.kcal, meta: m.calorias },
    { chave: "proteinas", rotulo: "Proteínas", unidade: "g", planejado: p.proteinas, meta: m.proteinas },
    { chave: "carboidratos", rotulo: "Carboidratos", unidade: "g", planejado: p.carboidratos, meta: m.carboidratos },
    { chave: "gorduras", rotulo: "Gorduras", unidade: "g", planejado: p.gorduras, meta: m.gorduras },
  ];
  const linhas = base.map((linha) => ({
    ...linha,
    percentual:
      linha.meta !== undefined && linha.meta > 0
        ? Math.round((linha.planejado / linha.meta) * 100)
        : undefined,
  }));
  return {
    linhas,
    temMeta: linhas.some((l) => l.meta !== undefined),
    itensCalculados: totais.itensCalculados,
  };
}

// ── Lista de compras ────────────────────────────────────────────────────────
// Agrega os alimentos de todas as refeições. Vinculados ao banco somam a
// quantidade numérica (mesma unidade) e herdam a categoria; avulsos são listados
// com suas quantidades em texto. Agrupado por categoria.

export interface ItemListaCompra {
  chave: string;
  nome: string;
  categoria: CategoriaAlimento;
  vinculado: boolean;
  quantidadeTotal?: number; // soma (vinculado, mesma unidade)
  unidade?: UnidadeMedidaAlimento;
  detalhes: string[]; // quantidades em texto (avulsos) para exibição
  ocorrencias: number;
}

export interface GrupoListaCompra {
  categoria: CategoriaAlimento;
  rotulo: string;
  itens: ItemListaCompra[];
}

const ROTULO_CATEGORIA: Record<CategoriaAlimento, string> = {
  proteina: "Proteínas",
  carboidrato: "Carboidratos",
  gordura: "Gorduras",
  fruta: "Frutas",
  vegetal: "Vegetais",
  laticinio: "Laticínios",
  bebida: "Bebidas",
  suplemento: "Suplementos",
  outro: "Outros",
};

const ORDEM_CATEGORIA: CategoriaAlimento[] = [
  "proteina",
  "carboidrato",
  "gordura",
  "vegetal",
  "fruta",
  "laticinio",
  "bebida",
  "suplemento",
  "outro",
];

function chaveNome(nome: string): string {
  return nome.trim().toLocaleLowerCase("pt-BR");
}

export function listaDeCompras(
  plano: PlanoAlimentar,
  banco: readonly AlimentoBanco[],
): GrupoListaCompra[] {
  const bancoPorId = indexarBanco(banco);
  const itens = new Map<string, ItemListaCompra>();

  for (const refeicao of plano.refeicoes) {
    for (const alimento of refeicao.alimentos) {
      const doBanco =
        alimento.bancoId !== undefined ? bancoPorId.get(alimento.bancoId) : undefined;
      const vinculado = Boolean(doBanco && alimento.quantidadeNum !== undefined);
      const categoria: CategoriaAlimento = doBanco?.categoria ?? "outro";
      const chave = vinculado ? `banco:${alimento.bancoId}` : `nome:${chaveNome(alimento.nome)}`;

      const existente = itens.get(chave);
      if (existente) {
        existente.ocorrencias += 1;
        if (vinculado && alimento.quantidadeNum !== undefined) {
          existente.quantidadeTotal = (existente.quantidadeTotal ?? 0) + alimento.quantidadeNum;
        } else if (alimento.quantidade.trim()) {
          existente.detalhes.push(alimento.quantidade.trim());
        }
      } else {
        itens.set(chave, {
          chave,
          nome: alimento.nome,
          categoria,
          vinculado,
          quantidadeTotal: vinculado ? alimento.quantidadeNum : undefined,
          unidade: doBanco?.unidade,
          detalhes: !vinculado && alimento.quantidade.trim() ? [alimento.quantidade.trim()] : [],
          ocorrencias: 1,
        });
      }
    }
  }

  const grupos = new Map<CategoriaAlimento, ItemListaCompra[]>();
  for (const item of itens.values()) {
    const lista = grupos.get(item.categoria) ?? [];
    lista.push(item);
    grupos.set(item.categoria, lista);
  }

  return ORDEM_CATEGORIA.filter((categoria) => grupos.has(categoria)).map((categoria) => ({
    categoria,
    rotulo: ROTULO_CATEGORIA[categoria],
    itens: (grupos.get(categoria) ?? []).sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    ),
  }));
}

// Texto plano da lista de compras (para copiar / enviar no WhatsApp).
export function listaDeComprasTexto(grupos: GrupoListaCompra[]): string {
  return grupos
    .map((grupo) => {
      const linhas = grupo.itens.map((item) => {
        const qtd =
          item.vinculado && item.quantidadeTotal !== undefined
            ? ` — ${arredondar1(item.quantidadeTotal)} ${item.unidade ?? ""}`.trimEnd()
            : item.detalhes.length > 0
              ? ` — ${item.detalhes.join(" + ")}`
              : "";
        return `• ${item.nome}${qtd}`;
      });
      return `*${grupo.rotulo}*\n${linhas.join("\n")}`;
    })
    .join("\n\n");
}
