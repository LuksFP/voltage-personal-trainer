import type { ModalidadeAtendimento, Objetivo, PersonalPublico } from "./types";

/* ──────────────────────────────────────────────────────────────
   Catálogo de personais: normalização do perfil público e a busca
   que o aluno usa. Tudo puro — sem React, sem store.
   ────────────────────────────────────────────────────────────── */

export const MODALIDADES: { id: ModalidadeAtendimento; label: string; detalhe: string }[] = [
  { id: "presencial", label: "Presencial", detalhe: "Atende na academia ou ao ar livre" },
  { id: "online", label: "Online", detalhe: "Planilha e acompanhamento à distância" },
  { id: "ambos", label: "Presencial e online", detalhe: "Atende dos dois jeitos" },
];

export const MODALIDADE_LABEL: Record<ModalidadeAtendimento, string> = {
  presencial: "Presencial",
  online: "Online",
  ambos: "Presencial e online",
};

const MODALIDADES_VALIDAS = new Set<ModalidadeAtendimento>(["presencial", "online", "ambos"]);

const OBJETIVOS_VALIDOS = new Set<Objetivo>([
  "Hipertrofia",
  "Emagrecimento",
  "Condicionamento",
  "Força",
  "Reabilitação",
  "Saúde geral",
]);

export type SalvarPerfilPublicoInput = Omit<
  PersonalPublico,
  "id" | "criadoEm" | "atualizadoEm" | "nota" | "totalAvaliacoes"
>;

function texto(valor: string, campo: string, maximo: number): string {
  const limpo = valor.trim();
  if (!limpo) throw new Error(`Preencha ${campo}.`);
  if (limpo.length > maximo) throw new Error(`${campo} passou de ${maximo} caracteres.`);
  return limpo;
}

function precoValido(valor: number | undefined, campo: string): number | undefined {
  if (valor === undefined) return undefined;
  if (!Number.isFinite(valor) || valor <= 0) throw new Error(`${campo} precisa ser maior que zero.`);
  return Math.round(valor * 100) / 100;
}

export function normalizarPerfilPublicoInput(
  input: SalvarPerfilPublicoInput,
): SalvarPerfilPublicoInput {
  if (!MODALIDADES_VALIDAS.has(input.modalidade)) {
    throw new Error("Escolha como você atende.");
  }
  const especialidades = input.especialidades.filter((item) => OBJETIVOS_VALIDOS.has(item));
  if (especialidades.length === 0) {
    throw new Error("Marque pelo menos uma especialidade.");
  }
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("E-mail inválido.");
  }
  const bairros = (input.bairros ?? [])
    .map((bairro) => bairro.trim())
    .filter((bairro) => bairro.length > 0);
  const anos = input.anosExperiencia;
  if (anos !== undefined && (!Number.isInteger(anos) || anos < 0 || anos > 70)) {
    throw new Error("Anos de experiência inválidos.");
  }

  return {
    email,
    nome: texto(input.nome, "seu nome", 120),
    bio: texto(input.bio, "sua apresentação", 600),
    especialidades: [...new Set(especialidades)],
    modalidade: input.modalidade,
    cidade: texto(input.cidade, "sua cidade", 80),
    ...(bairros.length > 0 ? { bairros } : {}),
    ...(input.precoMensal !== undefined
      ? { precoMensal: precoValido(input.precoMensal, "O valor mensal") }
      : {}),
    ...(input.precoAvulso !== undefined
      ? { precoAvulso: precoValido(input.precoAvulso, "O valor da aula avulsa") }
      : {}),
    ...(input.cref?.trim() ? { cref: input.cref.trim().slice(0, 40) } : {}),
    ...(anos !== undefined ? { anosExperiencia: anos } : {}),
    aceitandoAlunos: input.aceitandoAlunos,
  };
}

/* ---------- busca ---------- */

export type OrdenacaoCatalogo = "relevancia" | "preco" | "experiencia";

export interface FiltroCatalogo {
  texto?: string;
  cidade?: string;
  modalidade?: ModalidadeAtendimento;
  especialidade?: Objetivo;
  precoMaximo?: number;
  /** Por padrão, quem não está aceitando aluno some da lista. */
  incluirLotados?: boolean;
  ordenacao?: OrdenacaoCatalogo;
}

function normalizar(valor: string): string {
  return valor
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Menor preço divulgado — usado no filtro de teto e na ordenação. */
export function precoBase(perfil: PersonalPublico): number | undefined {
  const valores = [perfil.precoMensal, perfil.precoAvulso].filter(
    (valor): valor is number => valor !== undefined,
  );
  return valores.length > 0 ? Math.min(...valores) : undefined;
}

export function cidadesDisponiveis(perfis: PersonalPublico[]): string[] {
  return [...new Set(perfis.map((perfil) => perfil.cidade))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
}

export function filtrarPersonais(
  perfis: PersonalPublico[],
  filtro: FiltroCatalogo = {},
): PersonalPublico[] {
  const busca = filtro.texto ? normalizar(filtro.texto) : "";

  const resultado = perfis.filter((perfil) => {
    if (!filtro.incluirLotados && !perfil.aceitandoAlunos) return false;
    if (filtro.cidade && perfil.cidade !== filtro.cidade) return false;
    if (filtro.modalidade) {
      // "ambos" atende tanto quem procura presencial quanto online.
      const atende =
        perfil.modalidade === filtro.modalidade || perfil.modalidade === "ambos";
      if (!atende) return false;
    }
    if (filtro.especialidade && !perfil.especialidades.includes(filtro.especialidade)) {
      return false;
    }
    if (filtro.precoMaximo !== undefined) {
      const preco = precoBase(perfil);
      // Sem preço divulgado, o personal não some do filtro por teto.
      if (preco !== undefined && preco > filtro.precoMaximo) return false;
    }
    if (busca) {
      const alvo = normalizar(
        [perfil.nome, perfil.bio, perfil.cidade, ...(perfil.bairros ?? []), ...perfil.especialidades].join(
          " ",
        ),
      );
      if (!alvo.includes(busca)) return false;
    }
    return true;
  });

  return ordenarPersonais(resultado, filtro.ordenacao ?? "relevancia");
}

export function ordenarPersonais(
  perfis: PersonalPublico[],
  ordenacao: OrdenacaoCatalogo,
): PersonalPublico[] {
  const lista = [...perfis];
  if (ordenacao === "preco") {
    // Quem não divulga preço vai pro fim — não dá pra comparar.
    return lista.sort((a, b) => (precoBase(a) ?? Infinity) - (precoBase(b) ?? Infinity));
  }
  if (ordenacao === "experiencia") {
    return lista.sort((a, b) => (b.anosExperiencia ?? 0) - (a.anosExperiencia ?? 0));
  }
  // Relevância: nota primeiro, desempatando por volume de avaliações.
  return lista.sort(
    (a, b) => (b.nota ?? 0) - (a.nota ?? 0) || (b.totalAvaliacoes ?? 0) - (a.totalAvaliacoes ?? 0),
  );
}

/* ---------- apresentação ---------- */

export function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.charAt(0) ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : "";
  return (primeira + ultima).toUpperCase();
}

export function precoEmReais(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
