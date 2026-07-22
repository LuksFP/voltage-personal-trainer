import type { Divisao, Sessao } from "@/lib/types";

// 0 = domingo … 6 = sábado (alinhado com Date.getDay()).
export const DIAS_CURTOS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;
export const DIAS_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
export const DIAS_LONGOS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

/** Rótulo curto dos dias de uma divisão, ex.: "Seg · Qua · Sex". */
export function rotuloDias(dias: number[] | undefined): string {
  if (!dias || dias.length === 0) return "";
  if (dias.length === 7) return "Todos os dias";
  return [...dias]
    .sort((a, b) => a - b)
    .map((d) => DIAS_ABREV[d])
    .join(" · ");
}

export type EscolhaTreino =
  | { tipo: "agendado"; divisao: Divisao }
  | { tipo: "rodizio"; divisao: Divisao }
  | { tipo: "descanso" }
  | { tipo: "sem-treino" };

/**
 * Descobre qual divisão é o treino de hoje.
 * - Se alguma divisão tem dias marcados: usa a agenda semanal (ou "descanso" se hoje não tem).
 * - Sem agenda: rodízio — a próxima divisão depois da última concluída.
 */
export function escolherTreinoDoDia(
  divisoes: Divisao[],
  diaSemana: number,
  ultimaDivisaoConcluidaId: string | null,
): EscolhaTreino {
  const comExercicios = divisoes.filter(
    (d) => d.exercicios.length > 0 || (d.blocos?.length ?? 0) > 0,
  );
  if (comExercicios.length === 0) return { tipo: "sem-treino" };

  const temAgenda = comExercicios.some((d) => d.diasSemana && d.diasSemana.length > 0);
  if (temAgenda) {
    const doDia = comExercicios.find((d) => d.diasSemana?.includes(diaSemana));
    return doDia ? { tipo: "agendado", divisao: doDia } : { tipo: "descanso" };
  }

  const idx = ultimaDivisaoConcluidaId
    ? comExercicios.findIndex((d) => d.id === ultimaDivisaoConcluidaId)
    : -1;
  return { tipo: "rodizio", divisao: comExercicios[(idx + 1) % comExercicios.length] };
}

/** ID da última divisão concluída pelo aluno, a partir das sessões realizadas. */
export function ultimaDivisaoConcluida(
  sessoes: Sessao[],
  alunoId: string,
): string | null {
  const realizadas = sessoes
    .filter((s) => s.alunoId === alunoId && s.status === "realizada" && s.divisaoId)
    .sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora));
  return realizadas[0]?.divisaoId ?? null;
}
