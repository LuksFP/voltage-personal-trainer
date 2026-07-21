import type {
  HistoricoExercicio,
  HistoricoExercicioDetalhado,
  SerieExecutada,
} from "./types";

export interface ResumoExecucao {
  series: string;
  repeticoes: string;
  carga: string;
  descanso?: string;
}

export function seriesDeTrabalho(historico: HistoricoExercicio): SerieExecutada[] {
  return historico.formato === "por-serie"
    ? historico.seriesExecutadas.filter((serie) => serie.tipo === "trabalho")
    : [];
}

function resumirRepeticoes(series: SerieExecutada[]): string {
  const valores = series.map((serie) =>
    serie.resultado.metrica === "repeticoes"
      ? String(serie.resultado.repeticoes)
      : `${serie.resultado.duracaoSegundos}s`,
  );
  return Array.from(new Set(valores)).length === 1 ? valores[0] ?? "—" : valores.join("/");
}

function resumirCarga(series: SerieExecutada[]): string {
  const cargas = series.map((serie) => {
    if (serie.carga.modo === "externa") return `${serie.carga.valorKg}kg`;
    if (serie.carga.modo === "assistida") return `assist. ${serie.carga.valorKg}kg`;
    if (serie.carga.modo === "peso-corporal") return "peso corporal";
    return "sem carga";
  });
  return Array.from(new Set(cargas)).length === 1 ? cargas[0] ?? "—" : cargas.join("/");
}

export function resumoDaExecucao(historico: HistoricoExercicio): ResumoExecucao {
  if (historico.formato === "resumo-legado") return historico.resumoLegado;
  const trabalho = seriesDeTrabalho(historico);
  const base = trabalho.length > 0 ? trabalho : historico.seriesExecutadas;
  return {
    series: String(base.length),
    repeticoes: resumirRepeticoes(base),
    carga: resumirCarga(base),
    descanso: historico.descansoPlanejado,
  };
}

export function cargaReferenciaKg(historico: HistoricoExercicio): number | null {
  if (historico.formato === "resumo-legado") {
    const match = historico.resumoLegado.carga.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
    if (!match) return null;
    const valor = Number(match[1]);
    return Number.isFinite(valor) ? valor : null;
  }
  const cargas = seriesDeTrabalho(historico)
    .filter((serie) => serie.carga.modo === "externa")
    .map((serie) => (serie.carga.modo === "externa" ? serie.carga.valorKg : 0));
  return cargas.length > 0 ? Math.max(...cargas) : null;
}

export function volumeExato(historico: HistoricoExercicio): number | null {
  if (historico.formato !== "por-serie") return null;
  return seriesDeTrabalho(historico).reduce((total, serie) => {
    if (serie.resultado.metrica !== "repeticoes" || serie.carga.modo !== "externa") {
      return total;
    }
    return total + serie.resultado.repeticoes * serie.carga.valorKg;
  }, 0);
}

export function serieDeReferencia(
  historico: HistoricoExercicio,
): SerieExecutada | undefined {
  if (historico.formato !== "por-serie") return undefined;
  return seriesDeTrabalho(historico)
    .filter(
      (serie) =>
        serie.resultado.metrica === "repeticoes" && serie.carga.modo === "externa",
    )
    .sort((a, b) => {
      const cargaA = a.carga.modo === "externa" ? a.carga.valorKg : 0;
      const cargaB = b.carga.modo === "externa" ? b.carga.valorKg : 0;
      if (cargaB !== cargaA) return cargaB - cargaA;
      const repsA = a.resultado.metrica === "repeticoes" ? a.resultado.repeticoes : 0;
      const repsB = b.resultado.metrica === "repeticoes" ? b.resultado.repeticoes : 0;
      return repsB - repsA;
    })[0];
}

export function isHistoricoDetalhado(
  historico: HistoricoExercicio,
): historico is HistoricoExercicioDetalhado {
  return historico.formato === "por-serie";
}
