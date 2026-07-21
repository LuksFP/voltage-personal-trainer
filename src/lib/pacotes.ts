import type { PacoteSessoes, Sessao } from "./types";

export type StatusPacoteSessoes = "ativo" | "esgotado" | "expirado" | "encerrado";

export interface ResumoPacoteSessoes {
  contratadas: number;
  realizadas: number;
  restantes: number;
  excedentes: number;
  agendadasFuturas: number;
  status: StatusPacoteSessoes;
  percentual: number;
  diasParaValidade: number;
}

const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function dataUtc(dataIso: string): Date {
  const partes = DATA_ISO.exec(dataIso);
  if (!partes) throw new Error("Use uma data no formato YYYY-MM-DD.");
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    throw new Error("A data informada é inválida.");
  }
  return data;
}

function dataLocalIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function normalizarHoje(hoje: Date | string | undefined): string {
  if (typeof hoje === "string") {
    dataUtc(hoje);
    return hoje;
  }
  const data = hoje ? new Date(hoje.getTime()) : new Date();
  if (Number.isNaN(data.getTime())) throw new Error("A data de referência é inválida.");
  return dataLocalIso(data);
}

function diferencaDias(inicio: string, fim: string): number {
  return Math.round((dataUtc(fim).getTime() - dataUtc(inicio).getTime()) / 86_400_000);
}

function validarPacote(pacote: PacoteSessoes): void {
  if (!Number.isInteger(pacote.quantidadeContratada) || pacote.quantidadeContratada < 1) {
    throw new Error("A quantidade contratada deve ser um inteiro positivo.");
  }
  if (
    !Number.isInteger(pacote.utilizadasAntesDoVoltage) ||
    pacote.utilizadasAntesDoVoltage < 0
  ) {
    throw new Error("O ajuste de sessões utilizadas não pode ser negativo.");
  }
  dataUtc(pacote.dataInicio);
  dataUtc(pacote.dataValidade);
  if (pacote.dataValidade < pacote.dataInicio) {
    throw new Error("A validade do pacote não pode ser anterior ao início.");
  }
}

/**
 * Deriva o saldo do pacote sem persistir contadores redundantes. O percentual
 * representa o consumo real e pode ultrapassar 100 quando houver excedentes.
 */
export function resumoDoPacote(
  pacote: PacoteSessoes,
  sessoes: readonly Sessao[],
  hoje?: Date | string,
): ResumoPacoteSessoes {
  validarPacote(pacote);
  const dataHoje = normalizarHoje(hoje);
  const sessoesVinculadas = sessoes.filter(
    (sessao) => sessao.pacoteId === pacote.id && sessao.alunoId === pacote.alunoId,
  );
  const realizadasNoVoltage = sessoesVinculadas.filter(
    (sessao) => sessao.status === "realizada",
  ).length;
  const realizadas = pacote.utilizadasAntesDoVoltage + realizadasNoVoltage;
  const restantes = Math.max(0, pacote.quantidadeContratada - realizadas);
  const excedentes = Math.max(0, realizadas - pacote.quantidadeContratada);
  const agendadasFuturas = sessoesVinculadas.filter(
    (sessao) => sessao.status === "agendada" && sessao.data >= dataHoje,
  ).length;
  const diasParaValidade = diferencaDias(dataHoje, pacote.dataValidade);

  let status: StatusPacoteSessoes;
  if (!pacote.ativo) status = "encerrado";
  else if (diasParaValidade < 0) status = "expirado";
  else if (restantes === 0) status = "esgotado";
  else status = "ativo";

  return {
    contratadas: pacote.quantidadeContratada,
    realizadas,
    restantes,
    excedentes,
    agendadasFuturas,
    status,
    percentual: Math.round((realizadas / pacote.quantidadeContratada) * 1_000) / 10,
    diasParaValidade,
  };
}
