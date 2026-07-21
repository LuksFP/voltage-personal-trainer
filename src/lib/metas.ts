import { fimDaSemana, inicioDaSemana } from "./checkins";
import { seriesDeTrabalho } from "./historico-exercicios";
import type {
  Avaliacao,
  HistoricoExercicio,
  MedidaCorporalCentimetros,
  MedidaCorporalMeta,
  MetaAluno,
  Sessao,
} from "./types";

interface MetaInputBase {
  titulo: string;
  dataInicio: string;
  prazo: string;
  valorInicial: number;
}

export type CriarMetaAlunoInput = MetaInputBase &
  (
    | { tipo: "peso"; valorAlvo: number; unidade: "kg" }
    | {
        tipo: "medida-corporal";
        medida: "percentualGordura";
        valorAlvo: number;
        unidade: "%";
      }
    | {
        tipo: "medida-corporal";
        medida: MedidaCorporalCentimetros;
        valorAlvo: number;
        unidade: "cm";
      }
    | {
        tipo: "frequencia-semanal";
        valorAlvo: number;
        unidade: "sessoes/semana";
      }
    | {
        tipo: "carga-exercicio";
        valorAlvo: number;
        unidade: "kg";
        exercicioNomeSnapshot: string;
        bibliotecaId?: string;
      }
  );

export interface DadosCalculoMetaAluno {
  avaliacoes: readonly Avaliacao[];
  sessoes: readonly Sessao[];
  historicoExercicios: readonly HistoricoExercicio[];
}

export interface ProgressoMetaAluno {
  metaId: string;
  dataReferencia: string;
  valorAtual: number | null;
  percentual: number;
  prazoVencido: boolean;
  unidade: MetaAluno["unidade"];
}

export const MEDIDAS_CORPORAIS_META = [
  "percentualGordura",
  "cintura",
  "quadril",
  "peito",
  "braco",
  "coxa",
] as const satisfies readonly MedidaCorporalMeta[];

const DATA_LOCAL = /^(\d{4})-(\d{2})-(\d{2})$/;

function dataLocalHoje(referencia: Date = new Date()): string {
  if (Number.isNaN(referencia.getTime())) throw new Error("A data de referência é inválida.");
  const ano = referencia.getFullYear();
  const mes = String(referencia.getMonth() + 1).padStart(2, "0");
  const dia = String(referencia.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function validarDataMeta(data: string): string {
  const partes = DATA_LOCAL.exec(data);
  if (!partes) throw new Error("Use uma data no formato YYYY-MM-DD.");
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const utc = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    utc.getUTCFullYear() !== ano ||
    utc.getUTCMonth() !== mes - 1 ||
    utc.getUTCDate() !== dia
  ) {
    throw new Error("A data informada é inválida.");
  }
  return data;
}

function dataCivilValida(data: string): string | null {
  const dataCivil = data.slice(0, 10);
  try {
    return validarDataMeta(dataCivil);
  } catch {
    return null;
  }
}

function numeroNaFaixa(
  valor: number,
  nome: string,
  minimo: number,
  maximo: number,
  inteiro = false,
): number {
  if (
    !Number.isFinite(valor) ||
    valor < minimo ||
    valor > maximo ||
    (inteiro && !Number.isInteger(valor))
  ) {
    const formato = inteiro ? "inteiro " : "";
    throw new Error(`${nome} precisa ser um número ${formato}entre ${minimo} e ${maximo}.`);
  }
  return valor;
}

function validarValoresDiferentes(valorInicial: number, valorAlvo: number): void {
  if (valorInicial === valorAlvo) {
    throw new Error("O valor-alvo precisa ser diferente do valor inicial.");
  }
}

export function ehMedidaCorporalMeta(valor: unknown): valor is MedidaCorporalMeta {
  return (
    typeof valor === "string" &&
    MEDIDAS_CORPORAIS_META.some((medida) => medida === valor)
  );
}

/** Valida e remove espaços das entradas editáveis, preservando a união discriminada. */
export function normalizarMetaAlunoInput(
  input: CriarMetaAlunoInput,
): CriarMetaAlunoInput {
  if (typeof input !== "object" || input === null) {
    throw new Error("Os dados da meta são inválidos.");
  }
  const titulo = typeof input.titulo === "string" ? input.titulo.trim() : "";
  if (!titulo) throw new Error("Informe um título para a meta.");
  const dataInicio = validarDataMeta(input.dataInicio);
  const prazo = validarDataMeta(input.prazo);
  if (prazo < dataInicio) {
    throw new Error("O prazo da meta não pode ser anterior à data de início.");
  }

  if (input.tipo === "peso") {
    if (input.unidade !== "kg") throw new Error("A unidade da meta de peso deve ser kg.");
    const valorInicial = numeroNaFaixa(input.valorInicial, "O peso inicial", 20, 400);
    const valorAlvo = numeroNaFaixa(input.valorAlvo, "O peso-alvo", 20, 400);
    validarValoresDiferentes(valorInicial, valorAlvo);
    return { tipo: "peso", titulo, dataInicio, prazo, valorInicial, valorAlvo, unidade: "kg" };
  }

  if (input.tipo === "medida-corporal") {
    if (!ehMedidaCorporalMeta(input.medida)) {
      throw new Error("A medida corporal da meta é inválida.");
    }
    if (input.medida === "percentualGordura") {
      if (input.unidade !== "%") {
        throw new Error("A unidade do percentual de gordura deve ser %.");
      }
      const valorInicial = numeroNaFaixa(
        input.valorInicial,
        "O percentual de gordura inicial",
        1,
        80,
      );
      const valorAlvo = numeroNaFaixa(
        input.valorAlvo,
        "O percentual de gordura-alvo",
        1,
        80,
      );
      validarValoresDiferentes(valorInicial, valorAlvo);
      return {
        tipo: "medida-corporal",
        medida: "percentualGordura",
        titulo,
        dataInicio,
        prazo,
        valorInicial,
        valorAlvo,
        unidade: "%",
      };
    }
    if (input.unidade !== "cm") {
      throw new Error("A unidade das medidas corporais deve ser cm.");
    }
    const valorInicial = numeroNaFaixa(input.valorInicial, "A medida inicial", 1, 300);
    const valorAlvo = numeroNaFaixa(input.valorAlvo, "A medida-alvo", 1, 300);
    validarValoresDiferentes(valorInicial, valorAlvo);
    return {
      tipo: "medida-corporal",
      medida: input.medida,
      titulo,
      dataInicio,
      prazo,
      valorInicial,
      valorAlvo,
      unidade: "cm",
    };
  }

  if (input.tipo === "frequencia-semanal") {
    if (input.unidade !== "sessoes/semana") {
      throw new Error("A unidade da frequência deve ser sessões por semana.");
    }
    const valorInicial = numeroNaFaixa(
      input.valorInicial,
      "A frequência inicial",
      0,
      21,
      true,
    );
    const valorAlvo = numeroNaFaixa(
      input.valorAlvo,
      "A frequência-alvo",
      1,
      21,
      true,
    );
    validarValoresDiferentes(valorInicial, valorAlvo);
    return {
      tipo: "frequencia-semanal",
      titulo,
      dataInicio,
      prazo,
      valorInicial,
      valorAlvo,
      unidade: "sessoes/semana",
    };
  }

  if (input.tipo === "carga-exercicio") {
    if (input.unidade !== "kg") {
      throw new Error("A unidade da carga-alvo deve ser kg.");
    }
    const valorInicial = numeroNaFaixa(input.valorInicial, "A carga inicial", 0, 2_000);
    const valorAlvo = numeroNaFaixa(input.valorAlvo, "A carga-alvo", 0.5, 2_000);
    validarValoresDiferentes(valorInicial, valorAlvo);
    const exercicioNomeSnapshot =
      typeof input.exercicioNomeSnapshot === "string"
        ? input.exercicioNomeSnapshot.trim()
        : "";
    if (!exercicioNomeSnapshot) {
      throw new Error("Informe o exercício da meta de carga.");
    }
    if (input.bibliotecaId !== undefined && typeof input.bibliotecaId !== "string") {
      throw new Error("O vínculo do exercício com a biblioteca é inválido.");
    }
    const bibliotecaId = input.bibliotecaId?.trim() || undefined;
    return {
      tipo: "carga-exercicio",
      titulo,
      dataInicio,
      prazo,
      valorInicial,
      valorAlvo,
      unidade: "kg",
      exercicioNomeSnapshot,
      bibliotecaId,
    };
  }

  throw new Error("O tipo da meta é inválido.");
}

export function normalizarNomeExercicioMeta(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function ordenarMetasAluno(metas: readonly MetaAluno[]): MetaAluno[] {
  const ordemStatus: Record<MetaAluno["status"], number> = {
    ativa: 0,
    concluida: 1,
    arquivada: 2,
  };
  return [...metas].sort(
    (a, b) =>
      ordemStatus[a.status] - ordemStatus[b.status] ||
      a.prazo.localeCompare(b.prazo) ||
      b.atualizadoEm.localeCompare(a.atualizadoEm) ||
      a.titulo.localeCompare(b.titulo, "pt-BR") ||
      a.id.localeCompare(b.id),
  );
}

function valorDaAvaliacao(meta: MetaAluno, avaliacao: Avaliacao): number | undefined {
  if (meta.tipo === "peso") return avaliacao.peso;
  if (meta.tipo !== "medida-corporal") return undefined;
  switch (meta.medida) {
    case "percentualGordura":
      return avaliacao.percentualGordura;
    case "cintura":
      return avaliacao.cintura;
    case "quadril":
      return avaliacao.quadril;
    case "peito":
      return avaliacao.peito;
    case "braco":
      return avaliacao.braco;
    case "coxa":
      return avaliacao.coxa;
  }
}

function valorAtualAvaliacao(
  meta: MetaAluno,
  avaliacoes: readonly Avaliacao[],
  dataReferencia: string,
): number | null {
  const candidatas = avaliacoes.flatMap((avaliacao) => {
    if (avaliacao.alunoId !== meta.alunoId) return [];
    const data = dataCivilValida(avaliacao.data);
    if (!data || data < meta.dataInicio || data > dataReferencia) return [];
    const valor = valorDaAvaliacao(meta, avaliacao);
    if (valor === undefined || !Number.isFinite(valor)) return [];
    return [{ avaliacao, data, valor }];
  });
  candidatas.sort(
    (a, b) =>
      b.data.localeCompare(a.data) ||
      b.avaliacao.criadoEm.localeCompare(a.avaliacao.criadoEm) ||
      b.avaliacao.id.localeCompare(a.avaliacao.id),
  );
  return candidatas[0]?.valor ?? null;
}

function valorAtualFrequencia(
  meta: MetaAluno,
  sessoes: readonly Sessao[],
  dataReferencia: string,
): number | null {
  const inicioSemana = inicioDaSemana(dataReferencia);
  const fimSemana = fimDaSemana(inicioSemana);
  const inicioPeriodo = meta.dataInicio > inicioSemana ? meta.dataInicio : inicioSemana;
  const fimPeriodo = dataReferencia < fimSemana ? dataReferencia : fimSemana;
  if (fimPeriodo < inicioPeriodo) return null;
  const sessoesDaSemana = sessoes.filter(
    (sessao) =>
      sessao.alunoId === meta.alunoId &&
      sessao.data >= inicioPeriodo &&
      sessao.data <= fimPeriodo,
  );
  if (sessoesDaSemana.length === 0) return null;
  return sessoesDaSemana.filter((sessao) => sessao.status === "realizada").length;
}

function historicoCorrespondeMeta(
  meta: Extract<MetaAluno, { tipo: "carga-exercicio" }>,
  historico: HistoricoExercicio,
): boolean {
  if (meta.bibliotecaId && historico.bibliotecaId) {
    return meta.bibliotecaId === historico.bibliotecaId;
  }
  return (
    normalizarNomeExercicioMeta(meta.exercicioNomeSnapshot) ===
    normalizarNomeExercicioMeta(historico.nome)
  );
}

function valorAtualCarga(
  meta: Extract<MetaAluno, { tipo: "carga-exercicio" }>,
  historicos: readonly HistoricoExercicio[],
  dataReferencia: string,
): number | null {
  const cargas: number[] = [];
  for (const historico of historicos) {
    const dataHistorico = dataCivilValida(historico.data);
    if (
      historico.alunoId !== meta.alunoId ||
      !dataHistorico ||
      dataHistorico < meta.dataInicio ||
      dataHistorico > dataReferencia ||
      !historicoCorrespondeMeta(meta, historico)
    ) {
      continue;
    }
    for (const serie of seriesDeTrabalho(historico)) {
      if (serie.carga.modo === "externa" && Number.isFinite(serie.carga.valorKg)) {
        cargas.push(serie.carga.valorKg);
      }
    }
  }
  return cargas.length > 0 ? Math.max(...cargas) : null;
}

export function valorAtualMetaAluno(
  meta: MetaAluno,
  dados: DadosCalculoMetaAluno,
  dataReferencia: string = dataLocalHoje(),
): number | null {
  const referencia = validarDataMeta(dataReferencia);
  if (referencia < meta.dataInicio) return null;
  if (meta.tipo === "peso" || meta.tipo === "medida-corporal") {
    return valorAtualAvaliacao(meta, dados.avaliacoes, referencia);
  }
  if (meta.tipo === "frequencia-semanal") {
    return valorAtualFrequencia(meta, dados.sessoes, referencia);
  }
  return valorAtualCarga(meta, dados.historicoExercicios, referencia);
}

export function percentualProgressoMetaAluno(
  valorInicial: number,
  valorAlvo: number,
  valorAtual: number | null,
): number {
  if (valorAtual === null || !Number.isFinite(valorAtual) || valorInicial === valorAlvo) {
    return 0;
  }
  const bruto = ((valorAtual - valorInicial) / (valorAlvo - valorInicial)) * 100;
  const limitado = Math.max(0, Math.min(100, bruto));
  return Math.round(limitado * 10) / 10;
}

export function metaPrazoVencido(
  meta: MetaAluno,
  dataReferencia: string = dataLocalHoje(),
): boolean {
  const referencia = validarDataMeta(dataReferencia);
  return meta.status === "ativa" && referencia > meta.prazo;
}

export function calcularProgressoMeta(
  meta: MetaAluno,
  dados: DadosCalculoMetaAluno,
  dataReferencia: string = dataLocalHoje(),
): ProgressoMetaAluno {
  const referencia = validarDataMeta(dataReferencia);
  const valorAtual = valorAtualMetaAluno(meta, dados, referencia);
  return {
    metaId: meta.id,
    dataReferencia: referencia,
    valorAtual,
    percentual: percentualProgressoMetaAluno(
      meta.valorInicial,
      meta.valorAlvo,
      valorAtual,
    ),
    prazoVencido: metaPrazoVencido(meta, referencia),
    unidade: meta.unidade,
  };
}
