"use client";

import { useEffect, useState } from "react";
import { useStore, type SerieExecutadaInput } from "@/lib/store";
import { resumoDaExecucao } from "@/lib/historico-exercicios";
import { sugerirCarga, type SugestaoDeCarga } from "@/lib/progressao";
import {
  alternativasDoExercicio,
  type LocalTreino,
} from "@/lib/gerador-treino";
import { parseDescansoSegundos } from "@/lib/descanso";
import {
  detalhesDoBloco,
  tituloDoBloco,
  unidadesDaDivisao,
} from "@/lib/blocos-treino";
import type {
  CargaExecutada,
  Divisao,
  Exercicio,
  ExercicioBiblioteca,
  EscalaTreino,
  FeedbackTreino,
  NivelDor,
  Objetivo,
  ResultadoSerie,
  TipoSerieExecutada,
} from "@/lib/types";
import { Input, Select, Textarea, cx } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { SolicitacaoSubstituicaoForm } from "./SolicitacaoSubstituicaoForm";
import { EnviarVideoExecucaoForm } from "./EnviarVideoExecucaoForm";
import { removerVideoLocal, salvarVideoLocal } from "@/lib/video-storage";
import {
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  CopyIcon,
  PlayIcon,
  PlusIcon,
  SwapIcon,
  TrashIcon,
  VideoIcon,
} from "@/components/icons";
import { fmtDiaMes } from "@/lib/data";

const ESCALA_TREINO = [1, 2, 3, 4, 5] as const satisfies readonly EscalaTreino[];
const NIVEIS_DOR: NivelDor[] = ["Sem dor", "Leve", "Moderada", "Forte"];

type MetricaDraft = "repeticoes" | "tempo";
type ModoCargaDraft = CargaExecutada["modo"];

interface SerieDraft {
  id: string;
  ordem: number;
  tipo: TipoSerieExecutada;
  metrica: MetricaDraft;
  repeticoes: string;
  duracaoSegundos: string;
  modoCarga: ModoCargaDraft;
  valorKg: string;
  rpe: string;
  observacoes: string;
  concluida: boolean;
  concluidaEm?: string;
}

interface TimerDescansoDraft {
  totalSegundos: number;
  restanteSegundos: number;
  terminaEm?: number;
  pausado: boolean;
  contexto: string;
}

interface TreinoPortalDraft {
  versao: 1;
  operacaoId: string;
  iniciadoEm?: string;
  seriesPorExercicio: Record<string, SerieDraft[]>;
  feedback: FeedbackTreino;
  timer: TimerDescansoDraft | null;
}

function draftId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `draft_${agoraMs()}_${Math.random().toString(36).slice(2, 8)}`;
}

function agoraMs(): number {
  return Date.now();
}

function quantidadeInicial(series: string): number {
  const texto = series.trim();
  if (!/^\d+$/.test(texto)) return 1;
  const numero = Number(texto);
  return Number.isInteger(numero) && numero > 0 ? Math.min(numero, 20) : 1;
}

// Primeiro inteiro da prescrição de reps (em faixas "8-10" usa o limite inferior).
function repeticoesPrescritas(texto: string): string {
  const m = /\d+/.exec(texto ?? "");
  return m ? m[0] : "";
}

// Interpreta a carga prescrita pelo personal ("60kg", "corporal", "") num rascunho de série.
function cargaPrescrita(texto: string): { modoCarga: ModoCargaDraft; valorKg: string } {
  const t = (texto ?? "").trim().toLowerCase();
  if (!t) return { modoCarga: "externa", valorKg: "" };
  if (/corporal|peso do corpo|sem carga|livre/.test(t)) {
    return { modoCarga: "peso-corporal", valorKg: "" };
  }
  const m = /\d+(?:[.,]\d+)?/.exec(t);
  return { modoCarga: "externa", valorKg: m ? m[0].replace(",", ".") : "" };
}

type PrefillSerie = Partial<
  Pick<SerieDraft, "repeticoes" | "duracaoSegundos" | "modoCarga" | "valorKg">
>;

function novaSerie(
  ordem: number,
  metrica: MetricaDraft = "repeticoes",
  prefill: PrefillSerie = {},
): SerieDraft {
  return {
    id: draftId(),
    ordem,
    tipo: "trabalho",
    metrica,
    repeticoes: prefill.repeticoes ?? "",
    duracaoSegundos: prefill.duracaoSegundos ?? "",
    modoCarga: prefill.modoCarga ?? "externa",
    valorKg: prefill.valorKg ?? "",
    rpe: "",
    observacoes: "",
    concluida: false,
  };
}

function feedbackInicial(): FeedbackTreino {
  return {
    dificuldade: 3,
    energia: 3,
    dor: "Sem dor",
    observacoes: "",
  };
}

function seriesIniciais(divisao: Divisao): Record<string, SerieDraft[]> {
  return Object.fromEntries(
    unidadesDaDivisao(divisao).flatMap((unidade) =>
      unidade.exercicios.map((exercicio) => {
        const bloco = unidade.bloco;
        const quantidade =
          bloco && bloco.tipo !== "individual"
            ? Math.min(bloco.rounds, 20)
            : quantidadeInicial(exercicio.series);
        const metrica: MetricaDraft =
          bloco?.tipo === "circuito" && bloco.trabalhoSeg ? "tempo" : "repeticoes";
        const carga = cargaPrescrita(exercicio.carga);
        // Pré-preenche com o que o personal prescreveu, para o aluno só confirmar.
        const prefill: PrefillSerie =
          metrica === "tempo"
            ? {
                duracaoSegundos:
                  bloco?.tipo === "circuito" && bloco.trabalhoSeg
                    ? String(bloco.trabalhoSeg)
                    : "",
                ...carga,
              }
            : { repeticoes: repeticoesPrescritas(exercicio.repeticoes), ...carga };
        return [
          exercicio.id,
          Array.from({ length: quantidade }, (_, index) =>
            novaSerie(index + 1, metrica, prefill),
          ),
        ];
      }),
    ),
  );
}

function draftValido(value: unknown): value is TreinoPortalDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<TreinoPortalDraft>;
  return (
    draft.versao === 1 &&
    typeof draft.operacaoId === "string" &&
    draft.operacaoId.length > 0 &&
    Boolean(draft.seriesPorExercicio) &&
    typeof draft.seriesPorExercicio === "object" &&
    Boolean(draft.feedback) &&
    typeof draft.feedback === "object"
  );
}

function numeroPositivo(texto: string): number | null {
  const valor = Number(texto.replace(",", "."));
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}

function numeroNaoNegativo(texto: string): number | null {
  const valor = Number(texto.replace(",", "."));
  return Number.isFinite(valor) && valor >= 0 ? valor : null;
}

function erroDaSerie(serie: SerieDraft): string | null {
  // RPE é opcional; só valida a faixa se o aluno preencher.
  if (serie.rpe.trim() !== "") {
    const rpe = numeroPositivo(serie.rpe);
    if (rpe === null || rpe < 1 || rpe > 10) return "RPE deve ficar entre 1 e 10 (ou deixe em branco).";
  }
  if (serie.metrica === "repeticoes") {
    const repeticoes = numeroPositivo(serie.repeticoes);
    if (repeticoes === null || !Number.isInteger(repeticoes)) {
      return "Informe repetições inteiras e positivas.";
    }
  } else if (numeroPositivo(serie.duracaoSegundos) === null) {
    return "Informe a duração em segundos.";
  }
  if (
    (serie.modoCarga === "externa" || serie.modoCarga === "assistida") &&
    numeroNaoNegativo(serie.valorKg) === null
  ) {
    return "Informe uma carga válida em kg.";
  }
  return null;
}

function converterSerie(serie: SerieDraft): SerieExecutadaInput | null {
  if (erroDaSerie(serie)) return null;
  let rpe: number | undefined;
  if (serie.rpe.trim() !== "") {
    const parsed = numeroPositivo(serie.rpe);
    if (parsed === null) return null;
    rpe = parsed;
  }

  let resultado: ResultadoSerie;
  if (serie.metrica === "repeticoes") {
    const repeticoes = numeroPositivo(serie.repeticoes);
    if (repeticoes === null || !Number.isInteger(repeticoes)) return null;
    resultado = { metrica: "repeticoes", repeticoes };
  } else {
    const duracaoSegundos = numeroPositivo(serie.duracaoSegundos);
    if (duracaoSegundos === null) return null;
    resultado = { metrica: "tempo", duracaoSegundos };
  }

  let carga: CargaExecutada;
  if (serie.modoCarga === "externa" || serie.modoCarga === "assistida") {
    const valorKg = numeroNaoNegativo(serie.valorKg);
    if (valorKg === null) return null;
    carga = { modo: serie.modoCarga, valorKg };
  } else {
    carga = { modo: serie.modoCarga };
  }

  return {
    ordem: serie.ordem,
    tipo: serie.tipo,
    resultado,
    carga,
    ...(rpe !== undefined ? { rpe } : {}),
    concluidaEm: serie.concluidaEm ?? new Date().toISOString(),
    observacoes: serie.observacoes.trim() || undefined,
  };
}

export function TreinoEmAndamento({
  alunoId,
  treinoId,
  treinoNome,
  divisao,
  hoje,
  aberturaInicial,
  semPersonal = false,
  preferencias,
}: {
  alunoId: string;
  treinoId: string;
  treinoNome: string;
  divisao: Divisao;
  hoje: string;
  aberturaInicial: boolean;
  /** App do aluno sem personal vinculado: esconde pedido de troca e envio de vídeo,
   *  que dependem de alguém do outro lado para responder. */
  semPersonal?: boolean;
  /** Preferências de quem treina sozinho — habilitam a troca direta de exercício
   *  (sem personal não há a quem pedir; quem decide é o próprio aluno). */
  preferencias?: { local: LocalTreino; objetivo: Objetivo };
}) {
  const {
    sessoes,
    registrarTreinoRealizado,
    getExercicioBiblioteca,
    biblioteca,
    updateExercicio,
    ultimoHistoricoExercicio,
    solicitacoesDoAluno,
    addSolicitacaoSubstituicao,
    cancelarSolicitacaoSubstituicao,
    videosExecucao,
    addVideoExecucao,
    removeVideoExecucao,
  } = useStore();
  const solicitacoesSubstituicao = solicitacoesDoAluno(alunoId);
  const unidades = unidadesDaDivisao(divisao);
  const blocoPorExercicio = new Map(
    unidades.flatMap((unidade) =>
      unidade.exercicios.map((exercicio) => [exercicio.id, unidade.bloco] as const),
    ),
  );
  const descansoPorExercicio = new Map(
    unidades.flatMap((unidade) =>
      unidade.exercicios.map((exercicio, indice) => {
        const bloco = unidade.bloco;
        const ultimoDoBloco = indice === unidade.exercicios.length - 1;
        let segundos: number | null;
        if (bloco?.tipo === "circuito") {
          segundos = ultimoDoBloco
            ? bloco.descansoEntreRoundsSeg
            : bloco.transicaoSeg ?? null;
        } else if (bloco?.tipo === "superset") {
          segundos = ultimoDoBloco ? bloco.descansoEntreRoundsSeg : null;
        } else {
          segundos = parseDescansoSegundos(exercicio.descanso);
        }
        return [exercicio.id, segundos] as const;
      }),
    ),
  );
  const draftKey = `pt.portal.treino.v1:${alunoId}:${treinoId}:${divisao.id}:${hoje}`;
  const [aberto, setAberto] = useState(aberturaInicial);
  const [operacaoId, setOperacaoId] = useState(() => draftId());
  const [seriesPorExercicio, setSeriesPorExercicio] = useState<Record<string, SerieDraft[]>>(
    () => seriesIniciais(divisao),
  );
  const [feedback, setFeedback] = useState<FeedbackTreino>(() => feedbackInicial());
  const [iniciadoEm, setIniciadoEm] = useState<string | undefined>();
  const [timer, setTimer] = useState<TimerDescansoDraft | null>(null);
  const [draftCarregado, setDraftCarregado] = useState(false);
  const [draftRestaurado, setDraftRestaurado] = useState(false);
  const [exercicioTroca, setExercicioTroca] = useState<Exercicio | null>(null);
  const [exercicioTrocaLivre, setExercicioTrocaLivre] = useState<Exercicio | null>(null);
  const [exercicioVideo, setExercicioVideo] = useState<Exercicio | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [serieErroId, setSerieErroId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [registrado, setRegistrado] = useState(false);
  const [modoFoco, setModoFoco] = useState(false);
  const [focoIndex, setFocoIndex] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect -- hidratação deliberada de um snapshot externo do localStorage após o mount */
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(draftKey);
      if (salvo) {
        const parsed: unknown = JSON.parse(salvo);
        if (draftValido(parsed)) {
          setOperacaoId(parsed.operacaoId);
          setSeriesPorExercicio(parsed.seriesPorExercicio);
          setFeedback(parsed.feedback);
          setIniciadoEm(parsed.iniciadoEm);
          if (parsed.timer) {
            const restante = parsed.timer.terminaEm
              ? Math.max(0, Math.ceil((parsed.timer.terminaEm - agoraMs()) / 1000))
              : parsed.timer.restanteSegundos;
            setTimer(restante > 0 ? { ...parsed.timer, restanteSegundos: restante } : null);
          }
          setDraftRestaurado(
            Boolean(
              parsed.iniciadoEm ||
                Object.values(parsed.seriesPorExercicio).some((series) =>
                  series.some((serie) => serie.concluida),
                ),
            ),
          );
        }
      }
    } catch {
      localStorage.removeItem(draftKey);
    } finally {
      setDraftCarregado(true);
    }
  }, [draftKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!draftCarregado || registrado) return;
    if (!iniciadoEm && !timer) {
      localStorage.removeItem(draftKey);
      return;
    }
    const draft: TreinoPortalDraft = {
      versao: 1,
      operacaoId,
      iniciadoEm,
      seriesPorExercicio,
      feedback,
      timer,
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [
    draftCarregado,
    draftKey,
    feedback,
    iniciadoEm,
    operacaoId,
    registrado,
    seriesPorExercicio,
    timer,
  ]);

  const timerTerminaEm = timer?.terminaEm;
  const timerPausado = timer?.pausado;
  useEffect(() => {
    if (timerPausado || !timerTerminaEm) return;
    const atualizar = () => {
      const restante = Math.max(0, Math.ceil((timerTerminaEm - agoraMs()) / 1000));
      if (restante === 0) {
        setTimer(null);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([120, 80, 120]);
      } else {
        setTimer((atual) => (atual ? { ...atual, restanteSegundos: restante } : atual));
      }
    };
    atualizar();
    const interval = window.setInterval(atualizar, 250);
    return () => window.clearInterval(interval);
  }, [timerPausado, timerTerminaEm]);

  // Modo foco é tela cheia: trava o scroll do fundo (evita barra dupla) e liga o Esc.
  useEffect(() => {
    if (!modoFoco) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setModoFoco(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [modoFoco]);

  const sessaoConcluida = sessoes.find(
    (sessao) =>
      sessao.alunoId === alunoId &&
      sessao.data === hoje &&
      sessao.status === "realizada" &&
      (sessao.divisaoId === divisao.id || (!sessao.divisaoId && sessao.foco === divisao.nome)),
  );
  const sessoesAgendadasHoje = sessoes
    .filter(
      (sessao) =>
        sessao.alunoId === alunoId &&
        sessao.data === hoje &&
        sessao.status === "agendada",
    )
    .sort((a, b) => a.hora.localeCompare(b.hora));
  const sessaoAgendada =
    sessoesAgendadasHoje.find(
      (sessao) => sessao.divisaoId === divisao.id || sessao.foco === divisao.nome,
    ) ??
    sessoesAgendadasHoje.find((sessao) => sessao.treinoId === treinoId) ??
    sessoesAgendadasHoje[0];
  const concluidoHoje = Boolean(sessaoConcluida || registrado);
  const concluidas = Object.values(seriesPorExercicio).reduce(
    (total, series) => total + series.filter((serie) => serie.concluida).length,
    0,
  );
  const totalSeries = Object.values(seriesPorExercicio).reduce(
    (total, series) => total + series.length,
    0,
  );

  // Lista achatada de exercícios (na ordem dos blocos) para o modo foco.
  const itensFoco = unidades.flatMap((unidade) =>
    unidade.exercicios.map((exercicio) => ({
      exercicio,
      bloco: unidade.bloco,
      blocoAgrupado: Boolean(unidade.bloco && unidade.bloco.tipo !== "individual"),
    })),
  );

  const garantirInicio = () => {
    setIniciadoEm((atual) => atual ?? new Date().toISOString());
  };

  const abrirFoco = () => {
    garantirInicio();
    const primeiroPendente = itensFoco.findIndex((item) => {
      const series = seriesPorExercicio[item.exercicio.id] ?? [];
      return series.some((serie) => !serie.concluida);
    });
    setFocoIndex(primeiroPendente >= 0 ? primeiroPendente : 0);
    setErro(null);
    setModoFoco(true);
  };

  const iniciarTimer = (segundos: number, contexto: string) => {
    if (!Number.isFinite(segundos) || segundos <= 0) return;
    const totalSegundos = Math.min(3600, Math.round(segundos));
    setTimer({
      totalSegundos,
      restanteSegundos: totalSegundos,
      terminaEm: agoraMs() + totalSegundos * 1000,
      pausado: false,
      contexto,
    });
  };

  const pausarOuContinuarTimer = () => {
    setTimer((atual) => {
      if (!atual) return atual;
      if (atual.pausado) {
        return {
          ...atual,
          pausado: false,
          terminaEm: agoraMs() + atual.restanteSegundos * 1000,
        };
      }
      const restanteSegundos = atual.terminaEm
        ? Math.max(1, Math.ceil((atual.terminaEm - agoraMs()) / 1000))
        : atual.restanteSegundos;
      return { ...atual, pausado: true, terminaEm: undefined, restanteSegundos };
    });
  };

  const adicionarTempoTimer = () => {
    setTimer((atual) => {
      if (!atual) return atual;
      const restanteSegundos = Math.min(3600, atual.restanteSegundos + 15);
      return {
        ...atual,
        totalSegundos: Math.min(3600, atual.totalSegundos + 15),
        restanteSegundos,
        terminaEm: atual.pausado ? undefined : agoraMs() + restanteSegundos * 1000,
      };
    });
  };

  const descartarDraft = () => {
    if (!confirm("Descartar as séries preenchidas deste treino?")) return;
    localStorage.removeItem(draftKey);
    setSeriesPorExercicio(seriesIniciais(divisao));
    setFeedback(feedbackInicial());
    setOperacaoId(draftId());
    setIniciadoEm(undefined);
    setTimer(null);
    setDraftRestaurado(false);
    setErro(null);
  };

  const solicitarSubstituicao = (
    exercicio: Exercicio,
    motivo: Parameters<typeof addSolicitacaoSubstituicao>[0]["motivo"],
    detalhes: string,
  ) => {
    addSolicitacaoSubstituicao({
      alunoId,
      treinoId,
      divisaoId: divisao.id,
      exercicioId: exercicio.id,
      exercicioNomeSnapshot: exercicio.nome,
      motivo,
      detalhes,
    });
    setExercicioTroca(null);
  };

  const enviarVideo = async (
    exercicio: Exercicio,
    arquivo: File,
    duracaoSegundos: number | undefined,
    observacoesAluno: string,
  ) => {
    const video = addVideoExecucao({
      alunoId,
      treinoId,
      divisaoId: divisao.id,
      exercicioId: exercicio.id,
      exercicioNomeSnapshot: exercicio.nome,
      arquivoNome: arquivo.name,
      mimeType: arquivo.type,
      tamanhoBytes: arquivo.size,
      duracaoSegundos,
      observacoesAluno: observacoesAluno || undefined,
    });
    try {
      await salvarVideoLocal(video.id, arquivo);
      setExercicioVideo(null);
    } catch (error) {
      removeVideoExecucao(video.id);
      throw error;
    }
  };

  const apagarVideoPendente = async (videoId: string) => {
    await removerVideoLocal(videoId);
    removeVideoExecucao(videoId);
  };

  /**
   * Troca direta do exercício, sem pedir pra ninguém: é o caminho de quem
   * treina sozinho e pegou o aparelho ocupado. Só antes de marcar série —
   * depois disso o que já foi feito ficaria registrado com o nome errado.
   */
  const trocarExercicioLivre = (alvo: Exercicio, novo: ExercicioBiblioteca) => {
    updateExercicio(treinoId, divisao.id, {
      ...alvo,
      nome: novo.nome,
      bibliotecaId: novo.id,
      carga: novo.equipamento === "Peso corporal" ? "corporal" : "a definir",
    });
    setExercicioTrocaLivre(null);
  };

  const podeTrocarLivre = (exercicioId: string) =>
    semPersonal &&
    preferencias !== undefined &&
    !(seriesPorExercicio[exercicioId] ?? []).some((serie) => serie.concluida);

  /** Joga a carga sugerida nas séries que ainda não foram marcadas. */
  const aplicarCargaSugerida = (exercicioId: string, cargaKg: number) => {
    garantirInicio();
    const texto = String(cargaKg).replace(".", ",");
    setSeriesPorExercicio((atual) => ({
      ...atual,
      [exercicioId]: (atual[exercicioId] ?? []).map((serie) =>
        serie.concluida ? serie : { ...serie, modoCarga: "externa", valorKg: texto },
      ),
    }));
    setErro(null);
  };

  const alterarSerie = (exercicioId: string, serieId: string, patch: Partial<SerieDraft>) => {
    garantirInicio();
    setSeriesPorExercicio((atual) => ({
      ...atual,
      [exercicioId]: (atual[exercicioId] ?? []).map((serie) =>
        serie.id === serieId ? { ...serie, ...patch } : serie,
      ),
    }));
    setErro(null);
    setSerieErroId((atual) => (atual === serieId ? null : atual));
  };

  const alternarConcluida = (exercicioId: string, serie: SerieDraft) => {
    const exercicio = divisao.exercicios.find((item) => item.id === exercicioId);
    // Ao marcar, completa os campos vazios com a prescrição do personal.
    // Robusto para rascunhos antigos (salvos antes do pré-preenchimento).
    const preenchimento: Partial<SerieDraft> = {};
    if (!serie.concluida && exercicio) {
      if (serie.metrica === "repeticoes" && serie.repeticoes.trim() === "") {
        const reps = repeticoesPrescritas(exercicio.repeticoes);
        if (reps) preenchimento.repeticoes = reps;
      }
      if (serie.metrica === "tempo" && serie.duracaoSegundos.trim() === "") {
        const bloco = blocoPorExercicio.get(exercicioId);
        if (bloco?.tipo === "circuito" && bloco.trabalhoSeg) {
          preenchimento.duracaoSegundos = String(bloco.trabalhoSeg);
        }
      }
      if (
        (serie.modoCarga === "externa" || serie.modoCarga === "assistida") &&
        serie.valorKg.trim() === ""
      ) {
        const carga = cargaPrescrita(exercicio.carga);
        if (carga.modoCarga === "peso-corporal") preenchimento.modoCarga = "peso-corporal";
        else if (carga.valorKg) preenchimento.valorKg = carga.valorKg;
      }
    }
    const efetiva = { ...serie, ...preenchimento };
    if (!efetiva.concluida) {
      const mensagem = erroDaSerie(efetiva);
      if (mensagem) {
        setErro(`Série ${serie.ordem}: ${mensagem}`);
        setSerieErroId(serie.id);
        return;
      }
    }
    setSerieErroId(null);
    alterarSerie(exercicioId, serie.id, {
      ...preenchimento,
      concluida: !serie.concluida,
      concluidaEm: !serie.concluida ? new Date().toISOString() : undefined,
    });
    if (!serie.concluida) {
      const segundos = descansoPorExercicio.get(exercicioId);
      if (segundos && exercicio) iniciarTimer(segundos, `Após ${exercicio.nome}`);
    }
  };

  const adicionarSerie = (exercicioId: string) => {
    garantirInicio();
    setSeriesPorExercicio((atual) => {
      const existentes = atual[exercicioId] ?? [];
      const bloco = blocoPorExercicio.get(exercicioId);
      const metrica: MetricaDraft =
        bloco?.tipo === "circuito" && bloco.trabalhoSeg ? "tempo" : "repeticoes";
      return {
        ...atual,
        [exercicioId]: [...existentes, novaSerie(existentes.length + 1, metrica)],
      };
    });
  };

  const removerSerie = (exercicioId: string, serieId: string) => {
    garantirInicio();
    setSeriesPorExercicio((atual) => {
      const existentes = atual[exercicioId] ?? [];
      if (existentes.length <= 1) return atual;
      return {
        ...atual,
        [exercicioId]: existentes
          .filter((serie) => serie.id !== serieId)
          .map((serie, index) => ({ ...serie, ordem: index + 1 })),
      };
    });
  };

  const copiarAnterior = (exercicioId: string, serie: SerieDraft) => {
    const series = seriesPorExercicio[exercicioId] ?? [];
    const anterior = series.find((item) => item.ordem === serie.ordem - 1);
    if (!anterior) return;
    alterarSerie(exercicioId, serie.id, {
      tipo: anterior.tipo,
      metrica: anterior.metrica,
      repeticoes: anterior.repeticoes,
      duracaoSegundos: anterior.duracaoSegundos,
      modoCarga: anterior.modoCarga,
      valorKg: anterior.valorKg,
      rpe: anterior.rpe,
      observacoes: anterior.observacoes,
      concluida: false,
      concluidaEm: undefined,
    });
  };

  const concluir = () => {
    if (enviando || concluidoHoje) return;
    setErro(null);

    const exercicios = divisao.exercicios.flatMap((exercicio) => {
      const drafts = (seriesPorExercicio[exercicio.id] ?? []).filter((serie) => serie.concluida);
      if (drafts.length === 0) return [];
      const convertidas = drafts.map(converterSerie);
      if (convertidas.some((serie) => serie === null)) {
        throw new Error(`Revise as séries concluídas de ${exercicio.nome}.`);
      }
      return [
        {
          treinoId,
          treinoNome,
          divisaoId: divisao.id,
          divisaoNome: divisao.nome,
          exercicioId: exercicio.id,
          bibliotecaId: exercicio.bibliotecaId,
          nome: exercicio.nome,
          descansoPlanejado: exercicio.descanso,
          seriesExecutadas: convertidas.filter(
            (serie): serie is SerieExecutadaInput => serie !== null,
          ),
        },
      ];
    });

    if (exercicios.length === 0) {
      setErro("Conclua explicitamente ao menos uma série antes de finalizar o treino.");
      return;
    }

    try {
      setEnviando(true);
      const agora = new Date();
      const duracaoMin = iniciadoEm
        ? Math.max(1, Math.round((agora.getTime() - Date.parse(iniciadoEm)) / 60_000))
        : undefined;
      registrarTreinoRealizado({
        operacaoId,
        sessaoAgendadaId: sessaoAgendada?.id,
        alunoId,
        data: hoje,
        hora: `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`,
        duracaoMin,
        foco: divisao.nome,
        treinoId,
        divisaoId: divisao.id,
        feedback: {
          ...feedback,
          observacoes: feedback.observacoes?.trim() || undefined,
        },
        exercicios,
      });
      localStorage.removeItem(draftKey);
      setTimer(null);
      setRegistrado(true);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível registrar o treino.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl2 border border-line bg-surface/70">
      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="h-5 w-1.5 shrink-0 rounded-full bg-volt" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{divisao.nome}</p>
          <p className="text-xs text-muted">
            {divisao.exercicios.length} exercício{divisao.exercicios.length === 1 ? "" : "s"}
            {concluidoHoje
              ? " · feito hoje ✓"
              : concluidas > 0
                ? ` · ${concluidas}/${totalSeries} séries concluídas`
                : draftRestaurado
                  ? " · rascunho retomado"
                  : ""}
          </p>
        </div>
        <ChevronRightIcon
          className={cx("h-5 w-5 shrink-0 text-muted transition-transform", aberto && "rotate-90")}
        />
      </button>

      {aberto && (
        <div className="border-t border-line">
          {!concluidoHoje && itensFoco.length > 0 && (
            <div className="border-b border-line bg-surface-2/15 p-3">
              <button
                type="button"
                onClick={abrirFoco}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-volt py-3 text-sm font-bold text-ink transition-colors hover:bg-volt-strong"
              >
                <PlayIcon className="h-4 w-4" />
                Iniciar modo foco
              </button>
              <p className="mt-2 text-center text-xs text-muted">
                Um exercício por vez, com o cronômetro de descanso em tela cheia.
              </p>
            </div>
          )}
          {!concluidoHoje && (iniciadoEm || concluidas > 0 || timer) && (
            <div className="sticky top-[126px] z-[8] border-b border-line bg-bg/95 px-3 py-3 backdrop-blur-md">
              {timer ? (
                <TimerDescanso
                  timer={timer}
                  onPause={pausarOuContinuarTimer}
                  onAdd={adicionarTempoTimer}
                  onSkip={() => setTimer(null)}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-accent">Treino em andamento</span>
                      <span className="text-muted">{concluidas}/{totalSeries} séries</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-volt"
                        style={{ width: `${totalSeries > 0 ? (concluidas / totalSeries) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={descartarDraft}
                    className="shrink-0 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    Descartar
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="space-y-3 bg-surface-2/15 p-3">
            {unidades.map((unidade) => {
              const bloco = unidade.bloco;
              const blocoAgrupado = bloco && bloco.tipo !== "individual";
              const detalhes = bloco ? detalhesDoBloco(bloco) : [];
              return (
                <article
                  key={bloco?.id ?? unidade.exercicios[0]?.id}
                  className={cx(
                    "overflow-hidden rounded-xl border bg-surface/70",
                    blocoAgrupado ? "border-accent/35" : "border-line",
                  )}
                >
                  {blocoAgrupado && (
                    <div className="border-b border-accent/25 bg-accent/8 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-accent/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                          {tituloDoBloco(bloco)}
                        </span>
                        <span className="text-xs font-semibold text-muted">
                          {unidade.exercicios.length} exercícios
                        </span>
                      </div>
                      {detalhes.length > 0 && (
                        <p className="mt-1.5 flex flex-wrap gap-x-2 text-xs text-muted">
                          {detalhes.map((detalhe) => (
                            <span key={detalhe}>· {detalhe}</span>
                          ))}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="divide-y divide-[var(--color-line)]">
                    {unidade.exercicios.map((exercicio) => {
                      const itemBiblioteca = exercicio.bibliotecaId
                        ? getExercicioBiblioteca(exercicio.bibliotecaId)
                        : undefined;
                      const ultima = ultimoHistoricoExercicio(alunoId, {
                        nome: exercicio.nome,
                        bibliotecaId: exercicio.bibliotecaId,
                      });
                      const resumo = ultima ? resumoDaExecucao(ultima) : undefined;
                      const sugestao = ultima
                        ? sugerirCarga(ultima, exercicio.repeticoes)
                        : null;
                      const series = seriesPorExercicio[exercicio.id] ?? [];
                      const solicitacoesExercicio = solicitacoesSubstituicao.filter(
                        (solicitacao) =>
                          solicitacao.treinoId === treinoId &&
                          solicitacao.divisaoId === divisao.id &&
                          solicitacao.exercicioId === exercicio.id,
                      );
                      const solicitacaoPendente = solicitacoesExercicio.find(
                        (solicitacao) => solicitacao.status === "pendente",
                      );
                      const ultimaSolicitacao = solicitacoesExercicio[0];
                      const videosExercicio = videosExecucao
                        .filter(
                          (video) =>
                            video.alunoId === alunoId &&
                            video.treinoId === treinoId &&
                            video.divisaoId === divisao.id &&
                            video.exercicioId === exercicio.id,
                        )
                        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
                      const ultimoVideo = videosExercicio[0];
                      return (
                        <section key={exercicio.id} className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold">{exercicio.nome}</p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                                <span>
                                  Prescrito: {exercicio.series} × {exercicio.repeticoes}
                                </span>
                                {exercicio.carga && <span>· {exercicio.carga}</span>}
                                <span className="inline-flex items-center gap-1">
                                  · <ClockIcon className="h-3.5 w-3.5" /> {exercicio.descanso}
                                </span>
                              </p>
                              {resumo && ultima && (
                                <p className="mt-1 text-xs font-semibold text-accent">
                                  Último: {resumo.series}×{resumo.repeticoes}
                                  {resumo.carga ? ` · ${resumo.carga}` : ""} ·{" "}
                                  {fmtDiaMes(ultima.data)}
                                </p>
                              )}
                              {sugestao && (
                                <CargaSugerida
                                  sugestao={sugestao}
                                  onUsar={() =>
                                    aplicarCargaSugerida(exercicio.id, sugestao.cargaSugeridaKg)
                                  }
                                />
                              )}
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                              {itemBiblioteca?.videoUrl && (
                                <a
                                  href={itemBiblioteca.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
                                >
                                  <PlayIcon className="h-3.5 w-3.5" /> Como fazer
                                </a>
                              )}
                              {podeTrocarLivre(exercicio.id) && (
                                <button
                                  type="button"
                                  onClick={() => setExercicioTrocaLivre(exercicio)}
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-muted hover:bg-surface-2 hover:text-accent"
                                >
                                  <SwapIcon className="h-3.5 w-3.5" /> Trocar
                                </button>
                              )}
                              {!semPersonal &&
                                (solicitacaoPendente ? (
                                  <span className="rounded-full bg-orange-500/10 px-2 py-1 text-[10px] font-bold text-orange-300">
                                    Troca solicitada
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setExercicioTroca(exercicio)}
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-muted hover:bg-surface-2 hover:text-accent"
                                  >
                                    <SwapIcon className="h-3.5 w-3.5" /> Pedir troca
                                  </button>
                                ))}
                              {!semPersonal && (
                                <button
                                  type="button"
                                  onClick={() => setExercicioVideo(exercicio)}
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-muted hover:bg-surface-2 hover:text-accent"
                                >
                                  <VideoIcon className="h-3.5 w-3.5" /> Enviar vídeo
                                </button>
                              )}
                            </div>
                          </div>

                          {solicitacaoPendente && (
                            <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-orange-500/20 bg-orange-500/8 px-3 py-2 text-xs">
                              <div>
                                <p className="font-semibold text-orange-300">Aguardando resposta do personal</p>
                                <p className="mt-0.5 line-clamp-2 text-muted">{solicitacaoPendente.detalhes}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => cancelarSolicitacaoSubstituicao(solicitacaoPendente.id)}
                                className="shrink-0 font-semibold text-muted hover:text-danger"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                          {!solicitacaoPendente &&
                            ultimaSolicitacao &&
                            (ultimaSolicitacao.status === "aprovada" ||
                              ultimaSolicitacao.status === "recusada") && (
                              <div
                                className={cx(
                                  "mt-3 rounded-lg border px-3 py-2 text-xs",
                                  ultimaSolicitacao.status === "aprovada"
                                    ? "border-accent/25 bg-accent/8"
                                    : "border-line bg-surface-2/40",
                                )}
                              >
                                <p className="font-semibold">
                                  {ultimaSolicitacao.status === "aprovada"
                                    ? `Troca aprovada${ultimaSolicitacao.substituto ? `: ${ultimaSolicitacao.substituto.nome}` : ""}`
                                    : "Troca não realizada"}
                                </p>
                                {ultimaSolicitacao.respostaPersonal && (
                                  <p className="mt-0.5 text-muted">{ultimaSolicitacao.respostaPersonal}</p>
                                )}
                              </div>
                            )}
                          {ultimoVideo && (
                            <div
                              className={cx(
                                "mt-3 flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-xs",
                                ultimoVideo.status === "revisado"
                                  ? "border-accent/25 bg-accent/8"
                                  : "border-sky-500/20 bg-sky-500/8",
                              )}
                            >
                              <div>
                                <p className="font-semibold">
                                  {ultimoVideo.status === "revisado"
                                    ? "Vídeo revisado pelo personal"
                                    : "Vídeo enviado para revisão"}
                                </p>
                                {ultimoVideo.comentarioPersonal && (
                                  <p className="mt-0.5 text-muted">{ultimoVideo.comentarioPersonal}</p>
                                )}
                              </div>
                              {ultimoVideo.status === "pendente" && (
                                <button
                                  type="button"
                                  onClick={() => void apagarVideoPendente(ultimoVideo.id)}
                                  className="shrink-0 font-semibold text-muted hover:text-danger"
                                >
                                  Excluir
                                </button>
                              )}
                            </div>
                          )}

                          <div className="mt-3 space-y-2">
                            {series.map((serie) => (
                              <SerieRow
                                key={serie.id}
                                serie={serie}
                                placeholderRepeticoes={exercicio.repeticoes}
                                placeholderDuracao={
                                  bloco?.tipo === "circuito" && bloco.trabalhoSeg
                                    ? String(bloco.trabalhoSeg)
                                    : undefined
                                }
                                placeholderCarga={exercicio.carga}
                                rotuloOrdem={blocoAgrupado ? "Round" : "Série"}
                                podeRemover={series.length > 1}
                                podeCopiar={serie.ordem > 1}
                                erro={serieErroId === serie.id ? erro : null}
                                onChange={(patch) =>
                                  alterarSerie(exercicio.id, serie.id, patch)
                                }
                                onToggle={() => alternarConcluida(exercicio.id, serie)}
                                onCopy={() => copiarAnterior(exercicio.id, serie)}
                                onRemove={() => removerSerie(exercicio.id, serie.id)}
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => adicionarSerie(exercicio.id)}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10"
                          >
                            <PlusIcon className="h-3.5 w-3.5" />
                            {blocoAgrupado ? "Adicionar round" : "Adicionar série"}
                          </button>
                        </section>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="border-t border-line p-4">
            {concluidoHoje ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-accent/10 py-3 text-sm font-semibold text-accent">
                <CheckIcon className="h-4 w-4" /> Treino registrado hoje
              </div>
            ) : (
              <div className="space-y-4">
                <FeedbackForm
                  feedback={feedback}
                  onChange={(proximo) => {
                    garantirInicio();
                    setFeedback(proximo);
                  }}
                />
                {erro && (
                  <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
                    {erro}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      concluir();
                    } catch (error) {
                      setErro(
                        error instanceof Error ? error.message : "Revise as séries concluídas.",
                      );
                    }
                  }}
                  disabled={enviando || concluidas === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-volt py-3 text-sm font-semibold text-ink transition-colors hover:bg-volt-strong disabled:pointer-events-none disabled:opacity-40"
                >
                  <CheckIcon className="h-4 w-4" />
                  {enviando ? "Registrando…" : `Concluir treino · ${concluidas} série${concluidas === 1 ? "" : "s"}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
      <Modal
        open={exercicioTrocaLivre !== null}
        onClose={() => setExercicioTrocaLivre(null)}
        title="Trocar exercício"
      >
        {exercicioTrocaLivre && preferencias && (
          <TrocaLivreLista
            atual={exercicioTrocaLivre}
            opcoes={alternativasDoExercicio(
              biblioteca,
              exercicioTrocaLivre,
              preferencias,
              divisao.exercicios.map((item) => item.nome),
            )}
            onEscolher={(novo) => trocarExercicioLivre(exercicioTrocaLivre, novo)}
          />
        )}
      </Modal>

      <Modal
        open={exercicioTroca !== null}
        onClose={() => setExercicioTroca(null)}
        title="Solicitar outro exercício"
      >
        {exercicioTroca && (
          <SolicitacaoSubstituicaoForm
            exercicioNome={exercicioTroca.nome}
            onSubmit={(motivo, detalhes) =>
              solicitarSubstituicao(exercicioTroca, motivo, detalhes)
            }
            onCancel={() => setExercicioTroca(null)}
          />
        )}
      </Modal>
      <Modal
        open={exercicioVideo !== null}
        onClose={() => setExercicioVideo(null)}
        title="Enviar vídeo de execução"
      >
        {exercicioVideo && (
          <EnviarVideoExecucaoForm
            exercicioNome={exercicioVideo.nome}
            onSubmit={(arquivo, duracaoSegundos, observacoes) =>
              enviarVideo(exercicioVideo, arquivo, duracaoSegundos, observacoes)
            }
            onCancel={() => setExercicioVideo(null)}
          />
        )}
      </Modal>

      {modoFoco && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg">
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <button
              type="button"
              onClick={() => setModoFoco(false)}
              className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-text"
            >
              Sair
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-semibold">{divisao.nome}</p>
              <p className="text-xs text-muted">
                {concluidoHoje
                  ? "Treino concluído"
                  : focoIndex < itensFoco.length
                    ? `Exercício ${focoIndex + 1} de ${itensFoco.length}`
                    : "Revisão final"}
              </p>
            </div>
            <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-muted">
              {concluidas}/{totalSeries}
            </span>
          </header>
          <div className="h-1 shrink-0 bg-surface-2">
            <div
              className="h-full bg-volt transition-all"
              style={{ width: `${totalSeries > 0 ? (concluidas / totalSeries) * 100 : 0}%` }}
            />
          </div>

          {timer && !concluidoHoje && (
            <div className="shrink-0 border-b border-line bg-bg px-4 py-3">
              <TimerDescanso
                timer={timer}
                onPause={pausarOuContinuarTimer}
                onAdd={adicionarTempoTimer}
                onSkip={() => setTimer(null)}
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="mx-auto max-w-md">
              {concluidoHoje ? (
                <div className="grid place-items-center py-16 text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-2xl bg-volt text-ink">
                    <CheckIcon className="h-8 w-8" />
                  </span>
                  <p className="font-display mt-4 text-2xl font-bold">Treino concluído! 🔥</p>
                  <p className="mt-1 text-sm text-muted">
                    {concluidas} série{concluidas === 1 ? "" : "s"} registrada
                    {concluidas === 1 ? "" : "s"}. Mandou muito bem.
                  </p>
                  <button
                    type="button"
                    onClick={() => setModoFoco(false)}
                    className="mt-6 rounded-xl bg-volt px-6 py-2.5 text-sm font-bold text-ink hover:bg-volt-strong"
                  >
                    Fechar
                  </button>
                </div>
              ) : focoIndex < itensFoco.length ? (
                (() => {
                  const { exercicio, bloco, blocoAgrupado } = itensFoco[focoIndex];
                  const itemBiblioteca = exercicio.bibliotecaId
                    ? getExercicioBiblioteca(exercicio.bibliotecaId)
                    : undefined;
                  const ultima = ultimoHistoricoExercicio(alunoId, {
                    nome: exercicio.nome,
                    bibliotecaId: exercicio.bibliotecaId,
                  });
                  const resumo = ultima ? resumoDaExecucao(ultima) : undefined;
                  const sugestao = ultima ? sugerirCarga(ultima, exercicio.repeticoes) : null;
                  const series = seriesPorExercicio[exercicio.id] ?? [];
                  const ultimo = focoIndex === itensFoco.length - 1;
                  return (
                    <>
                      {blocoAgrupado && bloco && (
                        <span className="mb-2 inline-block rounded-md bg-accent/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                          {tituloDoBloco(bloco)}
                        </span>
                      )}
                      <h3 className="font-display text-2xl font-bold leading-tight">
                        {exercicio.nome}
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className="rounded-full bg-surface-2 px-3 py-1.5">
                          {exercicio.series} × {exercicio.repeticoes}
                        </span>
                        {exercicio.carga && (
                          <span className="rounded-full bg-surface-2 px-3 py-1.5">
                            {exercicio.carga}
                          </span>
                        )}
                        {exercicio.descanso && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5">
                            <ClockIcon className="h-3.5 w-3.5" /> {exercicio.descanso}
                          </span>
                        )}
                      </div>
                      {exercicio.observacoes && (
                        <p className="mt-2 text-sm text-muted">{exercicio.observacoes}</p>
                      )}
                      {resumo && ultima && (
                        <p className="mt-2 text-xs font-semibold text-accent">
                          Última vez: {resumo.series}×{resumo.repeticoes}
                          {resumo.carga ? ` · ${resumo.carga}` : ""} · {fmtDiaMes(ultima.data)}
                        </p>
                      )}
                      {sugestao && (
                        <CargaSugerida
                          sugestao={sugestao}
                          onUsar={() =>
                            aplicarCargaSugerida(exercicio.id, sugestao.cargaSugeridaKg)
                          }
                        />
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        {itemBiblioteca?.videoUrl && (
                          <a
                            href={itemBiblioteca.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent"
                          >
                            <VideoIcon className="h-4 w-4" /> Ver demonstração
                          </a>
                        )}
                        {podeTrocarLivre(exercicio.id) && (
                          <button
                            type="button"
                            onClick={() => setExercicioTrocaLivre(exercicio)}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-accent"
                          >
                            <SwapIcon className="h-4 w-4" /> Trocar exercício
                          </button>
                        )}
                      </div>

                      <div className="mt-5 space-y-2">
                        {series.map((serie) => (
                          <SerieRow
                            key={serie.id}
                            serie={serie}
                            placeholderRepeticoes={exercicio.repeticoes}
                            placeholderDuracao={
                              bloco?.tipo === "circuito" && bloco.trabalhoSeg
                                ? String(bloco.trabalhoSeg)
                                : undefined
                            }
                            placeholderCarga={exercicio.carga}
                            rotuloOrdem={blocoAgrupado ? "Round" : "Série"}
                            podeRemover={series.length > 1}
                            podeCopiar={serie.ordem > 1}
                            erro={serieErroId === serie.id ? erro : null}
                            onChange={(patch) => alterarSerie(exercicio.id, serie.id, patch)}
                            onToggle={() => alternarConcluida(exercicio.id, serie)}
                            onCopy={() => copiarAnterior(exercicio.id, serie)}
                            onRemove={() => removerSerie(exercicio.id, serie.id)}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => adicionarSerie(exercicio.id)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                        {blocoAgrupado ? "Adicionar round" : "Adicionar série"}
                      </button>
                      {erro && (
                        <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
                          {erro}
                        </p>
                      )}
                      {ultimo && (
                        <p className="mt-4 text-center text-xs text-muted">
                          Último exercício — avance para revisar e concluir.
                        </p>
                      )}
                    </>
                  );
                })()
              ) : (
                <>
                  <h3 className="font-display text-2xl font-bold">Como foi o treino?</h3>
                  <p className="mt-1 text-sm text-muted">
                    {semPersonal
                      ? "Fica registrado no seu histórico e guia a carga do próximo treino."
                      : "Seu feedback ajuda o personal a ajustar as cargas."}
                  </p>
                  <div className="mt-5">
                    <FeedbackForm
                      feedback={feedback}
                      onChange={(proximo) => {
                        garantirInicio();
                        setFeedback(proximo);
                      }}
                    />
                  </div>
                  {erro && (
                    <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
                      {erro}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        concluir();
                      } catch (error) {
                        setErro(
                          error instanceof Error ? error.message : "Revise as séries concluídas.",
                        );
                      }
                    }}
                    disabled={enviando || concluidas === 0}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-volt py-3.5 text-sm font-bold text-ink transition-colors hover:bg-volt-strong disabled:pointer-events-none disabled:opacity-40"
                  >
                    <CheckIcon className="h-4 w-4" />
                    {enviando
                      ? "Registrando…"
                      : `Concluir treino · ${concluidas} série${concluidas === 1 ? "" : "s"}`}
                  </button>
                </>
              )}
            </div>
          </div>

          {!concluidoHoje && (
            <footer className="flex items-center gap-3 border-t border-line bg-bg px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setErro(null);
                  setFocoIndex((i) => Math.max(0, i - 1));
                }}
                disabled={focoIndex === 0}
                className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40"
              >
                Anterior
              </button>
              {focoIndex < itensFoco.length && (
                <button
                  type="button"
                  onClick={() => {
                    setErro(null);
                    setFocoIndex((i) => Math.min(itensFoco.length, i + 1));
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface-2 py-2.5 text-sm font-bold text-text transition-colors hover:bg-surface-2/70"
                >
                  {focoIndex === itensFoco.length - 1 ? "Revisar e concluir" : "Próximo"}
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              )}
            </footer>
          )}
        </div>
      )}
    </>
  );
}

/** Alternativas do mesmo grupo muscular, pra trocar na hora. */
function TrocaLivreLista({
  atual,
  opcoes,
  onEscolher,
}: {
  atual: Exercicio;
  opcoes: ExercicioBiblioteca[];
  onEscolher: (novo: ExercicioBiblioteca) => void;
}) {
  if (opcoes.length === 0) {
    return (
      <p className="text-sm text-muted">
        Não achei outro exercício do mesmo grupo que caiba no seu treino — os que
        existem já estão na divisão de hoje.
      </p>
    );
  }
  return (
    <div>
      <p className="text-sm text-muted">
        No lugar de <strong className="text-text">{atual.nome}</strong>, mantendo{" "}
        {atual.series} × {atual.repeticoes}:
      </p>
      <ul className="mt-4 divide-y divide-[var(--color-line)]">
        {opcoes.map((opcao) => (
          <li key={opcao.id}>
            <button
              type="button"
              onClick={() => onEscolher(opcao)}
              className="flex w-full items-center justify-between gap-3 py-3 text-left hover:text-accent"
            >
              <span className="min-w-0">
                <span className="block font-semibold">{opcao.nome}</span>
                {opcao.equipamento && (
                  <span className="block text-xs text-muted">{opcao.equipamento}</span>
                )}
              </span>
              <SwapIcon className="h-4 w-4 shrink-0 text-muted" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A conta da progressão em uma linha: o que fazer com a carga hoje e por quê.
 * Fica logo abaixo do "último", que é a evidência de onde o número saiu.
 */
function CargaSugerida({
  sugestao,
  onUsar,
}: {
  sugestao: SugestaoDeCarga;
  onUsar: () => void;
}) {
  const kg = sugestao.cargaSugeridaKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span
        className={cx(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
          sugestao.direcao === "sobe"
            ? "bg-volt/15 text-volt"
            : sugestao.direcao === "alivia"
              ? "bg-danger/10 text-danger"
              : "bg-surface-2 text-muted",
        )}
      >
        {sugestao.direcao === "sobe" ? "Sobe" : sugestao.direcao === "alivia" ? "Alivia" : "Mantém"}
      </span>
      <span className="text-xs text-muted">
        <strong className="font-bold text-text">{kg} kg</strong> hoje · {sugestao.motivo}
      </span>
      <button
        type="button"
        onClick={onUsar}
        className="rounded-lg px-2 py-1 text-xs font-bold text-accent hover:bg-accent/10"
      >
        Usar
      </button>
    </div>
  );
}

function TimerDescanso({
  timer,
  onPause,
  onAdd,
  onSkip,
}: {
  timer: TimerDescansoDraft;
  onPause: () => void;
  onAdd: () => void;
  onSkip: () => void;
}) {
  const minutos = Math.floor(timer.restanteSegundos / 60);
  const segundos = timer.restanteSegundos % 60;
  const progresso = Math.max(
    0,
    Math.min(100, ((timer.totalSegundos - timer.restanteSegundos) / timer.totalSegundos) * 100),
  );
  return (
    <div className="rounded-xl border border-accent/35 bg-accent/8 p-3" role="timer" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-volt text-ink">
          <ClockIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
                Descanso {timer.pausado ? "pausado" : "em andamento"}
              </p>
              <p className="truncate text-xs text-muted">{timer.contexto}</p>
            </div>
            <p className="font-display shrink-0 text-2xl font-bold tabular-nums">
              {String(minutos).padStart(2, "0")}:{String(segundos).padStart(2, "0")}
            </p>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-volt" style={{ width: `${progresso}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={onPause}
          className="rounded-lg bg-surface-2 px-2 py-2 text-xs font-semibold text-text"
        >
          {timer.pausado ? "Continuar" : "Pausar"}
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg bg-surface-2 px-2 py-2 text-xs font-semibold text-text"
        >
          +15s
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-lg bg-surface-2 px-2 py-2 text-xs font-semibold text-muted"
        >
          Pular
        </button>
      </div>
    </div>
  );
}

function SerieRow({
  serie,
  placeholderRepeticoes,
  placeholderDuracao,
  placeholderCarga,
  rotuloOrdem,
  podeRemover,
  podeCopiar,
  erro: erroMarcacao,
  onChange,
  onToggle,
  onCopy,
  onRemove,
}: {
  serie: SerieDraft;
  placeholderRepeticoes: string;
  placeholderDuracao?: string;
  placeholderCarga: string;
  rotuloOrdem: "Série" | "Round";
  podeRemover: boolean;
  podeCopiar: boolean;
  erro?: string | null;
  onChange: (patch: Partial<SerieDraft>) => void;
  onToggle: () => void;
  onCopy: () => void;
  onRemove: () => void;
}) {
  const erro = (serie.concluida ? erroDaSerie(serie) : null) ?? erroMarcacao ?? null;
  return (
    <div
      className={cx(
        "rounded-xl border p-3 transition-colors",
        serie.concluida && !erro
          ? "border-accent/50 bg-accent/5"
          : erro
            ? "border-danger/50 bg-danger/5"
            : "border-line bg-surface-2/25",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggle}
            className={cx(
              "grid h-7 w-7 place-items-center rounded-lg border transition-colors",
              serie.concluida
                ? "border-volt bg-volt text-ink"
                : "border-line text-transparent hover:border-accent",
            )}
            aria-label={serie.concluida ? "Desmarcar série" : "Concluir série"}
          >
            <CheckIcon className="h-4 w-4" />
          </button>
          <span className="font-display text-sm font-bold">
            {rotuloOrdem} {serie.ordem}
          </span>
          <button
            type="button"
            onClick={() => onChange({ tipo: serie.tipo === "trabalho" ? "aquecimento" : "trabalho" })}
            className={cx(
              "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
              serie.tipo === "aquecimento"
                ? "bg-orange-500/10 text-orange-400"
                : "bg-surface-2 text-muted",
            )}
          >
            {serie.tipo === "aquecimento" ? "Aquecimento" : "Trabalho"}
          </button>
        </div>
        <div className="flex items-center gap-1">
          {podeCopiar && (
            <button type="button" onClick={onCopy} className="rounded-lg p-1.5 text-muted hover:bg-surface-2" aria-label="Copiar série anterior">
              <CopyIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            disabled={!podeRemover}
            className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-25"
            aria-label="Remover série"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Métrica</span>
          <Select
            value={serie.metrica}
            onChange={(event) => onChange({ metrica: event.target.value === "tempo" ? "tempo" : "repeticoes" })}
            tamanho="sm"
          >
            <option value="repeticoes">Repetições</option>
            <option value="tempo">Tempo</option>
          </Select>
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
            {serie.metrica === "repeticoes" ? "Reps" : "Segundos"}
          </span>
          <Input
            inputMode="decimal"
            value={serie.metrica === "repeticoes" ? serie.repeticoes : serie.duracaoSegundos}
            onChange={(event) =>
              onChange(
                serie.metrica === "repeticoes"
                  ? { repeticoes: event.target.value }
                  : { duracaoSegundos: event.target.value },
              )
            }
            placeholder={
              serie.metrica === "repeticoes"
                ? placeholderRepeticoes
                : placeholderDuracao ?? "30"
            }
            className="rounded-lg px-2.5 py-2 text-xs"
          />
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Carga</span>
          <Select
            value={serie.modoCarga}
            onChange={(event) => {
              const value = event.target.value;
              const modoCarga: ModoCargaDraft =
                value === "assistida" || value === "peso-corporal" || value === "sem-carga"
                  ? value
                  : "externa";
              onChange({ modoCarga });
            }}
            className="rounded-lg px-2 py-2 text-xs"
          >
            <option value="externa">Externa</option>
            <option value="assistida">Assistida</option>
            <option value="peso-corporal">Peso corporal</option>
            <option value="sem-carga">Sem carga</option>
          </Select>
        </label>
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">
            {serie.modoCarga === "externa" || serie.modoCarga === "assistida" ? (
              "Kg"
            ) : (
              <>RPE <span className="text-muted/60">(opcional)</span></>
            )}
          </span>
          {serie.modoCarga === "externa" || serie.modoCarga === "assistida" ? (
            <Input
              inputMode="decimal"
              value={serie.valorKg}
              onChange={(event) => onChange({ valorKg: event.target.value })}
              placeholder={placeholderCarga || "0"}
              className="rounded-lg px-2.5 py-2 text-xs"
            />
          ) : (
            <Input
              inputMode="decimal"
              value={serie.rpe}
              onChange={(event) => onChange({ rpe: event.target.value })}
              placeholder="8"
              className="rounded-lg px-2.5 py-2 text-xs"
            />
          )}
        </label>
      </div>
      {(serie.modoCarga === "externa" || serie.modoCarga === "assistida") && (
        <div className="mt-2 grid grid-cols-[5rem_1fr] gap-2">
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">RPE <span className="text-muted/60">(opcional)</span></span>
            <Input
              inputMode="decimal"
              value={serie.rpe}
              onChange={(event) => onChange({ rpe: event.target.value })}
              placeholder="8"
              className="rounded-lg px-2.5 py-2 text-xs"
            />
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted">Nota da série</span>
            <Input
              value={serie.observacoes}
              onChange={(event) => onChange({ observacoes: event.target.value })}
              placeholder="Opcional"
              className="rounded-lg px-2.5 py-2 text-xs"
            />
          </label>
        </div>
      )}
      {erro && <p className="mt-2 text-xs font-semibold text-danger">{erro}</p>}
    </div>
  );
}

function FeedbackForm({
  feedback,
  onChange,
}: {
  feedback: FeedbackTreino;
  onChange: (feedback: FeedbackTreino) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface/70 p-3">
      <p className="font-display text-sm font-semibold">Feedback do treino</p>
      <EscalaCampo
        label="Dificuldade"
        value={feedback.dificuldade}
        onChange={(dificuldade) => onChange({ ...feedback, dificuldade })}
      />
      <EscalaCampo
        label="Energia"
        value={feedback.energia}
        onChange={(energia) => onChange({ ...feedback, energia })}
      />
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Dor/desconforto</span>
        <Select
          value={feedback.dor}
          onChange={(event) => {
            const dor = NIVEIS_DOR.find((nivel) => nivel === event.target.value) ?? "Sem dor";
            onChange({ ...feedback, dor });
          }}
          className="rounded-lg py-2 text-xs"
        >
          {NIVEIS_DOR.map((nivel) => (
            <option key={nivel} value={nivel}>{nivel}</option>
          ))}
        </Select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Observações</span>
        <Textarea
          value={feedback.observacoes ?? ""}
          onChange={(event) => onChange({ ...feedback, observacoes: event.target.value })}
          rows={2}
          placeholder="Como foi o treino?"
          className="rounded-lg py-2 text-xs"
        />
      </label>
    </div>
  );
}

function EscalaCampo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: EscalaTreino;
  onChange: (value: EscalaTreino) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <div className="grid grid-cols-5 gap-1.5">
        {ESCALA_TREINO.map((numero) => (
          <button
            key={numero}
            type="button"
            onClick={() => onChange(numero)}
            className={cx(
              "h-9 rounded-lg border text-sm font-bold transition-colors",
              value === numero
                ? "border-volt bg-volt text-ink"
                : "border-line bg-surface-2/50 text-muted hover:border-accent/60 hover:text-text",
            )}
            aria-pressed={value === numero}
          >
            {numero}
          </button>
        ))}
      </div>
    </div>
  );
}
