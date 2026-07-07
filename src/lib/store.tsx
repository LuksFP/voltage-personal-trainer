"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Aluno,
  Avaliacao,
  Divisao,
  Exercicio,
  ExercicioBiblioteca,
  Pagamento,
  Sessao,
  Treino,
} from "./types";
import { vencimentoDe } from "./pagamentos";
import {
  alunosSeed,
  avaliacoesSeed,
  bibliotecaSeed,
  pagamentosSeed,
  sessoesSeed,
  treinosSeed,
} from "./seed";

const STORAGE_KEY = "pt.app.v1";

export interface StoreData {
  alunos: Aluno[];
  treinos: Treino[];
  avaliacoes: Avaliacao[];
  sessoes: Sessao[];
  pagamentos: Pagamento[];
  biblioteca: ExercicioBiblioteca[];
}

interface StoreContextValue extends StoreData {
  // alunos
  addAluno: (data: Omit<Aluno, "id" | "criadoEm" | "ativo"> & { ativo?: boolean }) => Aluno;
  updateAluno: (id: string, data: Partial<Aluno>) => void;
  removeAluno: (id: string) => void;
  getAluno: (id: string) => Aluno | undefined;
  // backup (substitui toda a base — usado na importação)
  substituirTudo: (data: StoreData) => void;
  // avaliações físicas
  avaliacoesDoAluno: (alunoId: string) => Avaliacao[];
  addAvaliacao: (alunoId: string, data: Omit<Avaliacao, "id" | "alunoId" | "criadoEm">) => Avaliacao;
  updateAvaliacao: (id: string, patch: Partial<Avaliacao>) => void;
  removeAvaliacao: (id: string) => void;
  // sessões (agenda)
  addSessao: (data: Omit<Sessao, "id" | "criadoEm" | "status"> & { status?: Sessao["status"] }) => Sessao;
  updateSessao: (id: string, patch: Partial<Sessao>) => void;
  removeSessao: (id: string) => void;
  // pagamentos (financeiro)
  pagamentosDaCompetencia: (competencia: string) => Pagamento[];
  addPagamento: (data: Omit<Pagamento, "id" | "criadoEm" | "status"> & { status?: Pagamento["status"] }) => Pagamento;
  updatePagamento: (id: string, patch: Partial<Pagamento>) => void;
  removePagamento: (id: string) => void;
  marcarPago: (id: string, dados?: { pagoEm?: string; metodo?: string }) => void;
  marcarPendente: (id: string) => void;
  // Gera as cobranças de uma competência para os alunos ativos com mensalidade.
  // Não duplica: pula quem já tem cobrança no mês. Retorna quantas foram criadas.
  gerarCobrancas: (competencia: string) => number;
  // biblioteca de exercícios (catálogo reutilizável)
  addExercicioBiblioteca: (data: Omit<ExercicioBiblioteca, "id" | "criadoEm">) => ExercicioBiblioteca;
  updateExercicioBiblioteca: (id: string, patch: Partial<ExercicioBiblioteca>) => void;
  removeExercicioBiblioteca: (id: string) => void;
  getExercicioBiblioteca: (id: string) => ExercicioBiblioteca | undefined;
  // treinos
  treinosDoAluno: (alunoId: string) => Treino[];
  addTreino: (alunoId: string, nome: string, descricao?: string) => Treino;
  updateTreino: (id: string, data: Partial<Treino>) => void;
  removeTreino: (id: string) => void;
  getTreino: (id: string) => Treino | undefined;
  // divisões
  addDivisao: (treinoId: string, nome: string) => void;
  updateDivisao: (treinoId: string, divisaoId: string, nome: string) => void;
  removeDivisao: (treinoId: string, divisaoId: string) => void;
  // exercícios
  addExercicio: (treinoId: string, divisaoId: string, ex: Omit<Exercicio, "id">) => void;
  updateExercicio: (treinoId: string, divisaoId: string, ex: Exercicio) => void;
  removeExercicio: (treinoId: string, divisaoId: string, exId: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// Data de hoje em YYYY-MM-DD local (sem deslocamento de fuso do toISOString).
function isoLocalHoje(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>({
    alunos: [],
    treinos: [],
    avaliacoes: [],
    sessoes: [],
    pagamentos: [],
    biblioteca: [],
  });
  const [hydrated, setHydrated] = useState(false);

  // hidratação a partir do localStorage (ou seed na primeira vez)
  useEffect(() => {
    const seed: StoreData = {
      alunos: alunosSeed,
      treinos: treinosSeed,
      avaliacoes: avaliacoesSeed,
      sessoes: sessoesSeed(),
      pagamentos: pagamentosSeed(),
      biblioteca: bibliotecaSeed,
    };
    let inicial: StoreData = seed;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Merge com defaults: bases salvas antes de uma feature não têm as chaves novas.
        const parsed = JSON.parse(raw) as Partial<StoreData>;
        inicial = {
          alunos: parsed.alunos ?? [],
          treinos: parsed.treinos ?? [],
          avaliacoes: parsed.avaliacoes ?? [],
          sessoes: parsed.sessoes ?? [],
          pagamentos: parsed.pagamentos ?? [],
          // biblioteca é catálogo de referência: bases antigas herdam o seed inicial
          biblioteca: parsed.biblioteca ?? bibliotecaSeed,
        };
      }
    } catch {
      inicial = seed;
    }
    // Carga inicial do estado no mount (padrão SSR-safe de hidratação do localStorage).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(inicial);
    setHydrated(true);
  }, []);

  // persistência
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, hydrated]);

  const value = useMemo<StoreContextValue>(() => {
    const mutTreino = (id: string, fn: (t: Treino) => Treino) =>
      setData((d) => ({
        ...d,
        treinos: d.treinos.map((t) => (t.id === id ? fn(t) : t)),
      }));

    return {
      alunos: data.alunos,
      treinos: data.treinos,
      avaliacoes: data.avaliacoes,
      sessoes: data.sessoes,
      pagamentos: data.pagamentos,
      biblioteca: data.biblioteca,

      addAluno: (input) => {
        const aluno: Aluno = {
          id: uid("aluno"),
          criadoEm: new Date().toISOString(),
          ativo: input.ativo ?? true,
          ...input,
        };
        setData((d) => ({ ...d, alunos: [aluno, ...d.alunos] }));
        return aluno;
      },
      updateAluno: (id, patch) =>
        setData((d) => ({
          ...d,
          alunos: d.alunos.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      removeAluno: (id) =>
        setData((d) => ({
          ...d,
          alunos: d.alunos.filter((a) => a.id !== id),
          treinos: d.treinos.filter((t) => t.alunoId !== id),
          avaliacoes: d.avaliacoes.filter((av) => av.alunoId !== id),
          sessoes: d.sessoes.filter((s) => s.alunoId !== id),
          pagamentos: d.pagamentos.filter((p) => p.alunoId !== id),
        })),
      getAluno: (id) => data.alunos.find((a) => a.id === id),

      substituirTudo: (novo) => setData(novo),

      avaliacoesDoAluno: (alunoId) =>
        data.avaliacoes
          .filter((av) => av.alunoId === alunoId)
          .sort((a, b) => a.data.localeCompare(b.data)),
      addAvaliacao: (alunoId, input) => {
        const avaliacao: Avaliacao = {
          id: uid("aval"),
          alunoId,
          criadoEm: new Date().toISOString(),
          ...input,
        };
        setData((d) => ({ ...d, avaliacoes: [...d.avaliacoes, avaliacao] }));
        return avaliacao;
      },
      updateAvaliacao: (id, patch) =>
        setData((d) => ({
          ...d,
          avaliacoes: d.avaliacoes.map((av) => (av.id === id ? { ...av, ...patch } : av)),
        })),
      removeAvaliacao: (id) =>
        setData((d) => ({ ...d, avaliacoes: d.avaliacoes.filter((av) => av.id !== id) })),

      addSessao: (input) => {
        const sessao: Sessao = {
          id: uid("sess"),
          criadoEm: new Date().toISOString(),
          status: input.status ?? "agendada",
          ...input,
        };
        setData((d) => ({ ...d, sessoes: [...d.sessoes, sessao] }));
        return sessao;
      },
      updateSessao: (id, patch) =>
        setData((d) => ({
          ...d,
          sessoes: d.sessoes.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      removeSessao: (id) =>
        setData((d) => ({ ...d, sessoes: d.sessoes.filter((s) => s.id !== id) })),

      pagamentosDaCompetencia: (comp) =>
        data.pagamentos.filter((p) => p.competencia === comp),
      addPagamento: (input) => {
        const pagamento: Pagamento = {
          id: uid("pag"),
          criadoEm: new Date().toISOString(),
          status: input.status ?? "pendente",
          ...input,
        };
        setData((d) => ({ ...d, pagamentos: [...d.pagamentos, pagamento] }));
        return pagamento;
      },
      updatePagamento: (id, patch) =>
        setData((d) => ({
          ...d,
          pagamentos: d.pagamentos.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removePagamento: (id) =>
        setData((d) => ({ ...d, pagamentos: d.pagamentos.filter((p) => p.id !== id) })),
      marcarPago: (id, dados) =>
        setData((d) => ({
          ...d,
          pagamentos: d.pagamentos.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "pago",
                  pagoEm: dados?.pagoEm ?? isoLocalHoje(),
                  metodo: dados?.metodo ?? p.metodo,
                }
              : p,
          ),
        })),
      marcarPendente: (id) =>
        setData((d) => ({
          ...d,
          pagamentos: d.pagamentos.map((p) =>
            // remove pagoEm/metodo ao reverter para pendente
            p.id === id ? { ...p, status: "pendente", pagoEm: undefined, metodo: undefined } : p,
          ),
        })),
      gerarCobrancas: (comp) => {
        const jaCobrado = new Set(
          data.pagamentos.filter((p) => p.competencia === comp).map((p) => p.alunoId),
        );
        const novas: Pagamento[] = data.alunos
          .filter((a) => a.ativo && (a.mensalidade ?? 0) > 0 && !jaCobrado.has(a.id))
          .map((a) => ({
            id: uid("pag"),
            alunoId: a.id,
            competencia: comp,
            valor: a.mensalidade!,
            vencimento: vencimentoDe(comp, a.diaVencimento ?? 5),
            status: "pendente" as const,
            criadoEm: new Date().toISOString(),
          }));
        if (novas.length > 0) {
          setData((d) => ({ ...d, pagamentos: [...d.pagamentos, ...novas] }));
        }
        return novas.length;
      },

      addExercicioBiblioteca: (input) => {
        const item: ExercicioBiblioteca = {
          id: uid("bib"),
          criadoEm: new Date().toISOString(),
          ...input,
        };
        setData((d) => ({ ...d, biblioteca: [item, ...d.biblioteca] }));
        return item;
      },
      updateExercicioBiblioteca: (id, patch) =>
        setData((d) => ({
          ...d,
          biblioteca: d.biblioteca.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      removeExercicioBiblioteca: (id) =>
        setData((d) => ({ ...d, biblioteca: d.biblioteca.filter((b) => b.id !== id) })),
      getExercicioBiblioteca: (id) => data.biblioteca.find((b) => b.id === id),

      treinosDoAluno: (alunoId) => data.treinos.filter((t) => t.alunoId === alunoId),
      addTreino: (alunoId, nome, descricao) => {
        const treino: Treino = {
          id: uid("treino"),
          alunoId,
          nome,
          descricao,
          ativo: true,
          divisoes: [],
          criadoEm: new Date().toISOString(),
        };
        setData((d) => ({ ...d, treinos: [treino, ...d.treinos] }));
        return treino;
      },
      updateTreino: (id, patch) => mutTreino(id, (t) => ({ ...t, ...patch })),
      removeTreino: (id) =>
        setData((d) => ({ ...d, treinos: d.treinos.filter((t) => t.id !== id) })),
      getTreino: (id) => data.treinos.find((t) => t.id === id),

      addDivisao: (treinoId, nome) =>
        mutTreino(treinoId, (t) => ({
          ...t,
          divisoes: [...t.divisoes, { id: uid("div"), nome, exercicios: [] }],
        })),
      updateDivisao: (treinoId, divisaoId, nome) =>
        mutTreino(treinoId, (t) => ({
          ...t,
          divisoes: t.divisoes.map((dv) => (dv.id === divisaoId ? { ...dv, nome } : dv)),
        })),
      removeDivisao: (treinoId, divisaoId) =>
        mutTreino(treinoId, (t) => ({
          ...t,
          divisoes: t.divisoes.filter((dv) => dv.id !== divisaoId),
        })),

      addExercicio: (treinoId, divisaoId, ex) =>
        mutTreino(treinoId, (t) => ({
          ...t,
          divisoes: t.divisoes.map((dv) =>
            dv.id === divisaoId
              ? { ...dv, exercicios: [...dv.exercicios, { id: uid("ex"), ...ex }] }
              : dv,
          ),
        })),
      updateExercicio: (treinoId, divisaoId, ex) =>
        mutTreino(treinoId, (t) => ({
          ...t,
          divisoes: t.divisoes.map((dv) =>
            dv.id === divisaoId
              ? { ...dv, exercicios: dv.exercicios.map((e) => (e.id === ex.id ? ex : e)) }
              : dv,
          ),
        })),
      removeExercicio: (treinoId, divisaoId, exId) =>
        mutTreino(treinoId, (t) => ({
          ...t,
          divisoes: t.divisoes.map((dv) =>
            dv.id === divisaoId
              ? { ...dv, exercicios: dv.exercicios.filter((e) => e.id !== exId) }
              : dv,
          ),
        })),
    };
  }, [data]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>");
  return ctx;
}

export type { Divisao };
