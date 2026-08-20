/**
 * Datas do Voltage — um lugar só.
 *
 * Regra que vale pra tudo aqui: **data do calendário é string `YYYY-MM-DD`**,
 * nunca `Date`. `Date` só aparece na fronteira (entrada do usuário, aritmética,
 * formatação) e some em seguida.
 *
 * O motivo de existir: `toISOString()` converte pra UTC, então de noite no
 * Brasil (UTC-3) ele devolve o dia seguinte — treino de segunda vira terça,
 * mensalidade vence um dia antes. Quem monta ISO aqui usa sempre os getters
 * locais (`getFullYear`/`getMonth`/`getDate`).
 *
 * Os formatadores têm nome do formato que produzem (`fmtDiaMes`, `fmtDataHora`)
 * porque as telas usam formatos diferentes de propósito: o gráfico quer "19/08",
 * o card de conquista quer "19 de ago. de 2026". Um `dataCurta()` genérico só
 * esconderia essa diferença.
 */

/** Aceita `YYYY-MM-DD` ou timestamp completo — só o dia importa. */
const SO_DATA = /^\d{4}-\d{2}-\d{2}$/;
const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

// ---------------------------------------------------------------- núcleo

/** `Date` → `YYYY-MM-DD` no fuso local. */
export function paraIso(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/** Hoje em `YYYY-MM-DD` local. A referência existe pra teste. */
export function hojeIso(referencia: Date = new Date()): string {
  return paraIso(referencia);
}

/**
 * `YYYY-MM-DD` → `Date` ao meio-dia local. Meio-dia (e não meia-noite) porque
 * há fusos onde a meia-noite de certos dias não existe por horário de verão.
 * Aceita timestamp completo: nesse caso considera só a parte da data.
 */
export function aoMeioDia(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00`);
}

/**
 * Soma (ou subtrai, com valor negativo) dias de calendário.
 *
 * A conta é feita em UTC de propósito: em horário local, o dia em que o relógio
 * adianta tem 23 horas, e `setDate` sobre ele pode devolver o dia errado. Em UTC
 * todo dia tem 24 horas, então somar 7 sempre anda exatamente 7 dias.
 */
export function somarDias(iso: string, dias: number): string {
  if (!Number.isInteger(dias)) throw new Error("A quantidade de dias deve ser inteira.");
  const resultado = dataUtc(iso.slice(0, 10));
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return paraIsoUtc(resultado);
}

/** Segunda-feira da semana da data (a semana do Voltage começa na segunda). */
export function inicioDaSemana(iso: string): string {
  const referencia = dataUtc(iso.slice(0, 10));
  const desdeSegunda = (referencia.getUTCDay() + 6) % 7;
  return somarDias(iso, -desdeSegunda);
}

/**
 * `YYYY-MM-DD` → `Date` em UTC, **validando** o dia (rejeita 2026-02-31).
 * Use pra aritmética de dias: em UTC não existe horário de verão pra atrapalhar
 * a contagem. Lança se a data for inválida.
 */
export function dataUtc(iso: string): Date {
  const partes = DATA_ISO.exec(iso);
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

/** `Date` (tratado como UTC) → `YYYY-MM-DD`. Par do `dataUtc`. */
export function paraIsoUtc(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Quantos dias de calendário separam duas datas (destino − origem). */
export function diferencaDias(origem: string, destino: string): number {
  const MS_POR_DIA = 86_400_000;
  return Math.round((dataUtc(destino).getTime() - dataUtc(origem).getTime()) / MS_POR_DIA);
}

/** `true` se a string é uma data de calendário bem formada e existente. */
export function ehDataValida(iso: string): boolean {
  if (!SO_DATA.test(iso)) return false;
  try {
    dataUtc(iso);
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------- formatação
//
// Todos aceitam data pura ou timestamp completo. Os de data usam meio-dia
// local; os de hora usam o instante como veio.

/** `19/08` — eixo de gráfico, lista compacta. */
export function fmtDiaMes(iso: string): string {
  return aoMeioDia(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** `19/08/2026` — data por extenso curta, a mais comum em formulário e recibo. */
export function fmtData(iso: string): string {
  return aoMeioDia(iso).toLocaleDateString("pt-BR");
}

/** `19 de ago.` — quando o ano é óbvio pelo contexto. */
export function fmtDiaMesCurto(iso: string): string {
  return aoMeioDia(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/** `19 de ago. de 2026` — histórico, onde o ano importa. */
export function fmtDiaMesAno(iso: string): string {
  return aoMeioDia(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** `19 de agosto de 2026` — documento (recibo impresso). */
export function fmtPorExtenso(iso: string): string {
  return aoMeioDia(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** `19 de ago., 14:30` — carimbo de quando algo foi registrado. */
export function fmtDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `19 de ago. de 2026, 14:30` — carimbo com ano. */
export function fmtDataHoraAno(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Competência `YYYY-MM` — o mês a que uma mensalidade se refere.
 * É diferente de vencimento: a competência de julho pode vencer em agosto.
 */
export function paraCompetencia(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}
