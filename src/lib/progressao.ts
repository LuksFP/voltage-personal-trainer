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
  /** Menor repetição entre as séries de trabalho — diz se a faixa fechou toda. */
  repeticoesMin: number;
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
    repeticoesMin: Math.min(...repeticoes),
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

function incrementoDeCarga(cargaKg: number): number {
  return cargaKg < 20 ? 1 : cargaKg < 60 ? 2.5 : 5;
}

function formatarKg(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/** "8-12" → {min:8, max:12}; "10" → {min:10, max:10}; "até a falha" → null. */
export function faixaDeRepeticoes(texto?: string): { min: number; max: number } | null {
  if (!texto) return null;
  const numeros = texto.match(/\d+/g)?.map(Number).filter((n) => n > 0) ?? [];
  if (numeros.length === 0) return null;
  const [primeiro, segundo] = numeros;
  const min = primeiro;
  const max = segundo !== undefined && segundo >= primeiro ? segundo : primeiro;
  return { min, max };
}

export interface SugestaoDeCarga {
  cargaAnteriorKg: number;
  cargaSugeridaKg: number;
  /** "sobe" | "mantém" | "alivia" — o que fazer hoje. */
  direcao: "sobe" | "mantem" | "alivia";
  /** Em que a conta se baseou: esforço declarado ou repetições fechadas. */
  base: "rpe" | "repeticoes";
  motivo: string;
}

/**
 * Sugestão de carga para a série de hoje, a partir da última execução.
 *
 * Com RPE registrado, o esforço manda. Sem RPE — que é o caso de quem treina
 * sozinho e não preenche esse campo —, vale a faixa de repetições: fechou o
 * topo em todas as séries, sobe; ficou abaixo do piso, segura a carga.
 * Sem nenhuma das duas informações não há o que sugerir, e a função devolve
 * `null` em vez de encher a tela de palpite vazio.
 */
export function sugerirCarga(
  historico: HistoricoExercicio,
  repeticoesPrescritas?: string,
): SugestaoDeCarga | null {
  if (historico.formato !== "por-serie") return null;
  const ponto = pontoDoHistorico(historico);
  if (!ponto || ponto.cargaKg <= 0) return null;

  const incremento = incrementoDeCarga(ponto.cargaKg);

  if (ponto.rpeMedio != null) {
    const rpe = ponto.rpeMedio;
    if (rpe <= 8) {
      return {
        cargaAnteriorKg: ponto.cargaKg,
        cargaSugeridaKg: arredondarMeioKg(ponto.cargaKg + incremento),
        direcao: "sobe",
        base: "rpe",
        motivo: `Sobra fôlego: RPE médio ${rpe.toFixed(1)} da última vez.`,
      };
    }
    if (rpe >= 9.5) {
      return {
        cargaAnteriorKg: ponto.cargaKg,
        cargaSugeridaKg: arredondarMeioKg(ponto.cargaKg * 0.95),
        direcao: "alivia",
        base: "rpe",
        motivo: `RPE médio ${rpe.toFixed(1)} — alivia hoje pra não travar a semana.`,
      };
    }
    return {
      cargaAnteriorKg: ponto.cargaKg,
      cargaSugeridaKg: ponto.cargaKg,
      direcao: "mantem",
      base: "rpe",
      motivo: `RPE médio ${rpe.toFixed(1)}: repete a carga e consolida.`,
    };
  }

  const faixa = faixaDeRepeticoes(repeticoesPrescritas);
  if (!faixa) return null;

  if (ponto.repeticoesMin >= faixa.max) {
    return {
      cargaAnteriorKg: ponto.cargaKg,
      cargaSugeridaKg: arredondarMeioKg(ponto.cargaKg + incremento),
      direcao: "sobe",
      base: "repeticoes",
      motivo: `Você fechou ${faixa.max} repetições em todas as séries com ${formatarKg(ponto.cargaKg)} kg.`,
    };
  }
  if (ponto.repeticoesMin < faixa.min) {
    return {
      cargaAnteriorKg: ponto.cargaKg,
      cargaSugeridaKg: ponto.cargaKg,
      direcao: "mantem",
      base: "repeticoes",
      motivo: `Da última vez uma série parou em ${ponto.repeticoesMin} — feche ${faixa.min} em todas antes de subir.`,
    };
  }
  return {
    cargaAnteriorKg: ponto.cargaKg,
    cargaSugeridaKg: ponto.cargaKg,
    direcao: "mantem",
    base: "repeticoes",
    motivo: `Mesma carga: falta chegar em ${faixa.max} repetições pra subir.`,
  };
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
