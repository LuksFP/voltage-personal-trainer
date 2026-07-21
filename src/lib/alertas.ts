import type { Aluno, HistoricoExercicio, NivelDor, Sessao, Treino } from "./types";
import { cargaReferenciaKg } from "./historico-exercicios";

export type TipoAlertaPersonal =
  | "sem-treino"
  | "sem-presenca"
  | "feedback-ruim"
  | "dor"
  | "sem-evolucao";

export type PrioridadeAlerta = "alta" | "media";

export interface AlertaPersonal {
  tipo: TipoAlertaPersonal;
  alunoId: string;
  nome: string;
  detalhe: string;
  prioridade: PrioridadeAlerta;
  data?: string;
}

export interface AlertasPersonal {
  semTreino: AlertaPersonal[];
  semPresenca: AlertaPersonal[];
  feedbackRuim: AlertaPersonal[];
  dor: AlertaPersonal[];
  semEvolucao: AlertaPersonal[];
}

interface DadosAlertasPersonal {
  alunos: Aluno[];
  treinos: Treino[];
  sessoes: Sessao[];
  historicoExercicios: HistoricoExercicio[];
}

interface OpcoesAlertasPersonal {
  diasSemTreino: number;
  diasFeedback: number;
  diasEvolucao: number;
  hoje?: Date;
}

interface ComparacaoCarga {
  nome: string;
  anterior: number;
  atual: number;
  data: string;
}

const DORES_RELEVANTES = new Set<NivelDor>(["Moderada", "Forte"]);

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dataLocal(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00`);
}

function diasDesde(iso: string, hoje: Date): number {
  const msDia = 24 * 60 * 60 * 1000;
  const base = dataLocal(iso).getTime();
  const ref = dataLocal(isoLocal(hoje)).getTime();
  return Math.max(0, Math.floor((ref - base) / msDia));
}

function dataCurta(iso: string): string {
  return dataLocal(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function chaveExercicio(h: HistoricoExercicio): string {
  return h.bibliotecaId ?? normalizarNome(h.nome);
}

function ultimoTreinoRealizado(alunoId: string, sessoes: Sessao[]): Sessao | undefined {
  return sessoes
    .filter((s) => s.alunoId === alunoId && s.status === "realizada")
    .sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora))[0];
}

function ultimoFeedbackRuim(alunoId: string, sessoes: Sessao[], corte: string): Sessao | undefined {
  return sessoes
    .filter(
      (s) =>
        s.alunoId === alunoId &&
        s.status === "realizada" &&
        s.data >= corte &&
        s.feedback &&
        (s.feedback.dificuldade >= 4 || s.feedback.energia <= 2),
    )
    .sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora))[0];
}

function ultimaDorRelevante(alunoId: string, sessoes: Sessao[], corte: string): Sessao | undefined {
  return sessoes
    .filter(
      (s) =>
        s.alunoId === alunoId &&
        s.status === "realizada" &&
        s.data >= corte &&
        s.feedback &&
        DORES_RELEVANTES.has(s.feedback.dor),
    )
    .sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora))[0];
}

function comparacoesDeCarga(
  alunoId: string,
  historico: HistoricoExercicio[],
  corte: string,
): ComparacaoCarga[] {
  const porExercicio = new Map<string, HistoricoExercicio[]>();
  for (const h of historico) {
    if (h.alunoId !== alunoId) continue;
    if (cargaReferenciaKg(h) === null) continue;
    const key = chaveExercicio(h);
    porExercicio.set(key, [...(porExercicio.get(key) ?? []), h]);
  }

  const comparacoes: ComparacaoCarga[] = [];
  for (const registros of porExercicio.values()) {
    const ordenados = registros.sort(
      (a, b) => a.data.localeCompare(b.data) || a.criadoEm.localeCompare(b.criadoEm),
    );
    for (let i = 1; i < ordenados.length; i += 1) {
      const anterior = ordenados[i - 1];
      const atual = ordenados[i];
      if (atual.data < corte) continue;
      const cargaAnterior = cargaReferenciaKg(anterior);
      const cargaAtual = cargaReferenciaKg(atual);
      if (cargaAnterior === null || cargaAtual === null) continue;
      comparacoes.push({
        nome: atual.nome,
        anterior: cargaAnterior,
        atual: cargaAtual,
        data: atual.data,
      });
    }
  }

  return comparacoes.sort((a, b) => b.data.localeCompare(a.data));
}

function cortePorDias(hoje: Date, dias: number): string {
  const d = new Date(hoje);
  d.setDate(hoje.getDate() - dias);
  return isoLocal(d);
}

export function calcularAlertasPersonal(
  dados: DadosAlertasPersonal,
  opcoes: OpcoesAlertasPersonal,
): AlertasPersonal {
  const hoje = opcoes.hoje ?? new Date();
  const ativos = dados.alunos.filter((a) => a.ativo);
  const cortePresenca = cortePorDias(hoje, opcoes.diasSemTreino);
  const corteFeedback = cortePorDias(hoje, opcoes.diasFeedback);
  const corteEvolucao = cortePorDias(hoje, opcoes.diasEvolucao);

  const semTreino: AlertaPersonal[] = [];
  const semPresenca: AlertaPersonal[] = [];
  const feedbackRuim: AlertaPersonal[] = [];
  const dor: AlertaPersonal[] = [];
  const semEvolucao: AlertaPersonal[] = [];

  for (const aluno of ativos) {
    const temTreinoAtivo = dados.treinos.some((t) => t.alunoId === aluno.id && t.ativo);
    if (!temTreinoAtivo) {
      semTreino.push({
        tipo: "sem-treino",
        alunoId: aluno.id,
        nome: aluno.nome,
        detalhe: `${aluno.modalidade ?? aluno.objetivo ?? "Aluno ativo"} sem planilha ativa`,
        prioridade: "alta",
      });
    }

    const ultimo = ultimoTreinoRealizado(aluno.id, dados.sessoes);
    if (!ultimo || ultimo.data < cortePresenca) {
      semPresenca.push({
        tipo: "sem-presenca",
        alunoId: aluno.id,
        nome: aluno.nome,
        detalhe: ultimo
          ? `Último treino há ${diasDesde(ultimo.data, hoje)} dias`
          : "Nenhum treino realizado registrado",
        prioridade: "media",
        data: ultimo?.data,
      });
    }

    const sessaoRuim = ultimoFeedbackRuim(aluno.id, dados.sessoes, corteFeedback);
    if (sessaoRuim?.feedback) {
      feedbackRuim.push({
        tipo: "feedback-ruim",
        alunoId: aluno.id,
        nome: aluno.nome,
        detalhe: `Dif. ${sessaoRuim.feedback.dificuldade}/5 · energia ${sessaoRuim.feedback.energia}/5 em ${dataCurta(sessaoRuim.data)}`,
        prioridade: "media",
        data: sessaoRuim.data,
      });
    }

    const sessaoDor = ultimaDorRelevante(aluno.id, dados.sessoes, corteFeedback);
    if (sessaoDor?.feedback) {
      dor.push({
        tipo: "dor",
        alunoId: aluno.id,
        nome: aluno.nome,
        detalhe: `${sessaoDor.feedback.dor} em ${dataCurta(sessaoDor.data)}${sessaoDor.foco ? ` · ${sessaoDor.foco}` : ""}`,
        prioridade: sessaoDor.feedback.dor === "Forte" ? "alta" : "media",
        data: sessaoDor.data,
      });
    }

    const comparacoes = comparacoesDeCarga(aluno.id, dados.historicoExercicios, corteEvolucao);
    const aumentos = comparacoes.filter((c) => c.atual > c.anterior);
    if (comparacoes.length >= 2 && aumentos.length === 0) {
      const exemplo = comparacoes[0];
      semEvolucao.push({
        tipo: "sem-evolucao",
        alunoId: aluno.id,
        nome: aluno.nome,
        detalhe: `${comparacoes.length} cargas sem aumento. Ex.: ${exemplo.nome} ${exemplo.anterior}→${exemplo.atual}`,
        prioridade: "media",
        data: exemplo.data,
      });
    }
  }

  return {
    semTreino: semTreino.sort((a, b) => a.nome.localeCompare(b.nome)),
    semPresenca: semPresenca.sort((a, b) => (a.data ?? "").localeCompare(b.data ?? "")),
    feedbackRuim: feedbackRuim.sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "")),
    dor: dor.sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "")),
    semEvolucao: semEvolucao.sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "")),
  };
}
