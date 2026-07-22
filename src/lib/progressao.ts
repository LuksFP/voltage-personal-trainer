import { seriesDeTrabalho, volumeExato } from "./historico-exercicios";
import type { HistoricoExercicio, HistoricoExercicioDetalhado } from "./types";

export interface PontoProgressao {
  historicoId: string;
  data: string;
  cargaKg: number;
  volumeKg: number;
  e1rmKg: number;
  rpeMedio: number | null;
  repeticoesMax: number;
}

export interface AnaliseExercicio {
  chave: string;
  nome: string;
  bibliotecaId?: string;
  pontos: PontoProgressao[];
  cargaMaxKg: number;
  volumeMaxKg: number;
  e1rmMaxKg: number;
}

export interface PontoVolumeTotal {
  data: string;
  volumeKg: number;
}

export interface SugestaoCalculada {
  historicoOrigemId: string;
  treinoId?: string;
  divisaoId?: string;
  exercicioId?: string;
  bibliotecaId?: string;
  nome: string;
  cargaAtualKg: number;
  cargaSugeridaKg: number;
  rpeMedio: number;
  motivo: string;
}

function mediaRpe(series: { rpe?: number }[]): number | null {
  const comRpe = series.filter((serie): serie is { rpe: number } => serie.rpe != null);
  if (comRpe.length === 0) return null;
  return comRpe.reduce((total, serie) => total + serie.rpe, 0) / comRpe.length;
}

function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function chaveExercicio(historico: HistoricoExercicio): string {
  return historico.bibliotecaId ?? normalizarNome(historico.nome);
}

function pontoDoHistorico(historico: HistoricoExercicioDetalhado): PontoProgressao | null {
  const series = seriesDeTrabalho(historico).filter(
    (serie) => serie.resultado.metrica === "repeticoes" && serie.carga.modo === "externa",
  );
  if (series.length === 0) return null;

  const cargas = series.map((serie) =>
    serie.carga.modo === "externa" ? serie.carga.valorKg : 0,
  );
  const repeticoes = series.map((serie) =>
    serie.resultado.metrica === "repeticoes" ? serie.resultado.repeticoes : 0,
  );
  const e1rm = series.map((serie) => {
    const carga = serie.carga.modo === "externa" ? serie.carga.valorKg : 0;
    const reps = serie.resultado.metrica === "repeticoes" ? serie.resultado.repeticoes : 0;
    return carga * (1 + reps / 30);
  });
  return {
    historicoId: historico.id,
    data: historico.data,
    cargaKg: Math.max(...cargas),
    volumeKg: volumeExato(historico) ?? 0,
    e1rmKg: Math.max(...e1rm),
    rpeMedio: mediaRpe(series),
    repeticoesMax: Math.max(...repeticoes),
  };
}

export function analisarExercicios(
  historicos: HistoricoExercicio[],
  alunoId: string,
): AnaliseExercicio[] {
  const grupos = new Map<
    string,
    { nome: string; bibliotecaId?: string; pontos: PontoProgressao[] }
  >();

  for (const historico of historicos) {
    if (historico.alunoId !== alunoId || historico.formato !== "por-serie") continue;
    const ponto = pontoDoHistorico(historico);
    if (!ponto) continue;
    const chave = chaveExercicio(historico);
    const atual = grupos.get(chave) ?? {
      nome: historico.nome,
      bibliotecaId: historico.bibliotecaId,
      pontos: [],
    };
    atual.pontos.push(ponto);
    grupos.set(chave, atual);
  }

  return Array.from(grupos.entries())
    .map(([chave, grupo]) => {
      const pontos = grupo.pontos.sort(
        (a, b) => a.data.localeCompare(b.data) || a.historicoId.localeCompare(b.historicoId),
      );
      return {
        chave,
        nome: grupo.nome,
        bibliotecaId: grupo.bibliotecaId,
        pontos,
        cargaMaxKg: Math.max(...pontos.map((ponto) => ponto.cargaKg)),
        volumeMaxKg: Math.max(...pontos.map((ponto) => ponto.volumeKg)),
        e1rmMaxKg: Math.max(...pontos.map((ponto) => ponto.e1rmKg)),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function volumeTotalPorData(
  historicos: HistoricoExercicio[],
  alunoId: string,
): PontoVolumeTotal[] {
  const porData = new Map<string, number>();
  for (const historico of historicos) {
    if (historico.alunoId !== alunoId) continue;
    const volume = volumeExato(historico);
    if (volume === null || volume <= 0) continue;
    porData.set(historico.data, (porData.get(historico.data) ?? 0) + volume);
  }
  return Array.from(porData.entries())
    .map(([data, volumeKg]) => ({ data, volumeKg }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

function arredondarMeioKg(valor: number): number {
  return Math.round(valor * 2) / 2;
}

export function calcularSugestao(historico: HistoricoExercicio): SugestaoCalculada | null {
  if (historico.formato !== "por-serie") return null;
  const ponto = pontoDoHistorico(historico);
  if (!ponto) return null;
  // Sem RPE registrado não há como sugerir ajuste de carga por esforço.
  const rpeMedio = ponto.rpeMedio;
  if (rpeMedio == null) return null;

  let cargaSugeridaKg = ponto.cargaKg;
  let motivo = `Manter ${ponto.cargaKg} kg: RPE médio ${rpeMedio.toFixed(1)} pede consolidação.`;
  if (rpeMedio <= 8) {
    const incremento = ponto.cargaKg < 20 ? 1 : ponto.cargaKg < 60 ? 2.5 : 5;
    cargaSugeridaKg = arredondarMeioKg(ponto.cargaKg + incremento);
    motivo = `Subir ${incremento} kg: todas as séries ficaram com RPE médio ${rpeMedio.toFixed(1)}.`;
  } else if (rpeMedio >= 9.5) {
    cargaSugeridaKg = arredondarMeioKg(ponto.cargaKg * 0.95);
    motivo = `Reduzir cerca de 5%: RPE médio ${rpeMedio.toFixed(1)} indica esforço muito alto.`;
  }

  return {
    historicoOrigemId: historico.id,
    treinoId: historico.treinoId,
    divisaoId: historico.divisaoId,
    exercicioId: historico.exercicioId,
    bibliotecaId: historico.bibliotecaId,
    nome: historico.nome,
    cargaAtualKg: ponto.cargaKg,
    cargaSugeridaKg,
    rpeMedio,
    motivo,
  };
}

export function sugestoesMaisRecentes(
  historicos: HistoricoExercicio[],
  alunoId: string,
): SugestaoCalculada[] {
  const maisRecentes = new Map<string, HistoricoExercicio>();
  for (const historico of historicos) {
    if (historico.alunoId !== alunoId || historico.formato !== "por-serie") continue;
    const chave = chaveExercicio(historico);
    const anterior = maisRecentes.get(chave);
    if (
      !anterior ||
      historico.data > anterior.data ||
      (historico.data === anterior.data && historico.criadoEm > anterior.criadoEm)
    ) {
      maisRecentes.set(chave, historico);
    }
  }
  return Array.from(maisRecentes.values())
    .map(calcularSugestao)
    .filter((sugestao): sugestao is SugestaoCalculada => sugestao !== null)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
