"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Aluno, Avaliacao, Divisao, Exercicio, Sessao, Treino } from "./types";
import { alunosSeed, avaliacoesSeed, sessoesSeed, treinosSeed } from "./seed";

const STORAGE_KEY = "pt.app.v1";

export interface StoreData {
  alunos: Aluno[];
  treinos: Treino[];
  avaliacoes: Avaliacao[];
  sessoes: Sessao[];
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>({
    alunos: [],
    treinos: [],
    avaliacoes: [],
    sessoes: [],
  });
  const [hydrated, setHydrated] = useState(false);

  // hidratação a partir do localStorage (ou seed na primeira vez)
  useEffect(() => {
    const seed: StoreData = {
      alunos: alunosSeed,
      treinos: treinosSeed,
      avaliacoes: avaliacoesSeed,
      sessoes: sessoesSeed(),
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
