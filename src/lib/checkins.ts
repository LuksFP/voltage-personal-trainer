import type { CheckinSemanal } from "./types";

const DATA_LOCAL = /^(\d{4})-(\d{2})-(\d{2})$/;

function comoDataLocal(valor: Date | string): Date {
  if (valor instanceof Date) {
    const copia = new Date(valor.getTime());
    if (Number.isNaN(copia.getTime())) throw new Error("Data inválida.");
    return copia;
  }

  const partes = DATA_LOCAL.exec(valor);
  if (partes) {
    const ano = Number(partes[1]);
    const mes = Number(partes[2]);
    const dia = Number(partes[3]);
    const data = new Date(ano, mes - 1, dia, 12);
    if (
      data.getFullYear() !== ano ||
      data.getMonth() !== mes - 1 ||
      data.getDate() !== dia
    ) {
      throw new Error("Data inválida.");
    }
    return data;
  }

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) throw new Error("Data inválida.");
  return data;
}

function dataLocalIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Retorna a segunda-feira da semana da data informada, no fuso local. */
export function inicioDaSemana(data: Date | string = new Date()): string {
  const local = comoDataLocal(data);
  local.setHours(12, 0, 0, 0);
  const diasDesdeSegunda = (local.getDay() + 6) % 7;
  local.setDate(local.getDate() - diasDesdeSegunda);
  return dataLocalIso(local);
}

/** Retorna o domingo correspondente à semana iniciada na data informada. */
export function fimDaSemana(semanaInicio: string): string {
  const inicioNormalizado = comoDataLocal(inicioDaSemana(semanaInicio));
  inicioNormalizado.setDate(inicioNormalizado.getDate() + 6);
  return dataLocalIso(inicioNormalizado);
}

/**
 * Traduz respostas objetivas em alertas curtos para a fila de revisão do personal.
 * Não faz diagnóstico: apenas destaca respostas que merecem contexto ou acompanhamento.
 */
export function pontosDeAtencaoCheckin(checkin: CheckinSemanal): string[] {
  const pontos: string[] = [];

  if (checkin.energia <= 2) {
    pontos.push(`Energia baixa (${checkin.energia}/5).`);
  }

  const sinaisSono: string[] = [];
  if (checkin.sono <= 2) sinaisSono.push(`qualidade ${checkin.sono}/5`);
  if (checkin.horasSono !== undefined && checkin.horasSono < 6) {
    sinaisSono.push(
      `${checkin.horasSono.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h por noite`,
    );
  }
  if (sinaisSono.length > 0) pontos.push(`Sono abaixo do ideal (${sinaisSono.join("; ")}).`);

  if (checkin.estresse >= 4) {
    pontos.push(`Estresse elevado (${checkin.estresse}/5).`);
  }
  if (checkin.alimentacao <= 2) {
    pontos.push(`Alimentação percebida como baixa (${checkin.alimentacao}/5).`);
  }

  if (checkin.dor !== "Sem dor") {
    const local = checkin.localDor?.trim();
    pontos.push(`Dor ${checkin.dor.toLocaleLowerCase("pt-BR")}${local ? ` em ${local}` : ""}.`);
  }

  if (checkin.observacoes?.trim()) {
    pontos.push("O aluno deixou observações para revisão.");
  }

  return pontos;
}
