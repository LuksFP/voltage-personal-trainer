import type { FasePrograma, ProgramaTreino } from "./types";
import { paraIso } from "@/lib/data";

function dateFromIso(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

export function adicionarDias(iso: string, dias: number): string {
  const data = dateFromIso(iso);
  data.setUTCDate(data.getUTCDate() + dias);
  return paraIso(data);
}

export function diferencaDias(inicio: string, fim: string): number {
  return Math.round((dateFromIso(fim).getTime() - dateFromIso(inicio).getTime()) / 86_400_000);
}

export function duracaoProgramaSemanas(programa: Pick<ProgramaTreino, "dataInicio" | "dataFim">): number {
  return Math.max(1, Math.ceil((diferencaDias(programa.dataInicio, programa.dataFim) + 1) / 7));
}

export function intervaloFase(
  programa: Pick<ProgramaTreino, "dataInicio" | "dataFim">,
  fase: Pick<FasePrograma, "semanaInicial" | "duracaoSemanas">,
): { inicio: string; fim: string } {
  const inicio = adicionarDias(programa.dataInicio, (Math.max(1, fase.semanaInicial) - 1) * 7);
  const fimCalculado = adicionarDias(inicio, Math.max(1, fase.duracaoSemanas) * 7 - 1);
  return { inicio, fim: fimCalculado > programa.dataFim ? programa.dataFim : fimCalculado };
}

export function proximoDiaDoPrograma(programa: Pick<ProgramaTreino, "dataFim">): string {
  return adicionarDias(programa.dataFim, 1);
}

export function dataFimComMesmaDuracao(
  programa: Pick<ProgramaTreino, "dataInicio" | "dataFim">,
  novoInicio: string,
): string {
  return adicionarDias(novoInicio, Math.max(0, diferencaDias(programa.dataInicio, programa.dataFim)));
}

export function formatarDataCurta(iso: string): string {
  return dateFromIso(iso).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
