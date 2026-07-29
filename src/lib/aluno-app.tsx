"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "./store";
import { gerarPlano, type PreferenciasTreino } from "./gerador-treino";
import type { Aluno, PersonalPublico, Treino } from "./types";

/* ──────────────────────────────────────────────────────────────
   Conta do aluno que usa o app sozinho, sem personal.

   MOCK: a conta vive no localStorage deste aparelho e o perfil é um
   Aluno marcado com `contaApp` dentro do store — assim todas as telas
   do portal (treino em andamento, evolução, hábitos) funcionam sem
   reescrever nada. Quando o Supabase entrar, `alunoId` vira user_id.
   ────────────────────────────────────────────────────────────── */

const CONTA_KEY = "pt.aluno.v1";

/** Aula experimental que o aluno pediu a um personal do catálogo. */
export interface PedidoAula {
  personalPublicoId: string;
  interessadoId: string;
  em: string;
}

export interface ContaAluno {
  alunoId: string;
  nome: string;
  preferencias: PreferenciasTreino;
  /** Quantas vezes o aluno pediu outro treino — muda as escolhas do gerador. */
  variacao: number;
  criadaEm: string;
  /** Contas criadas antes do catálogo não têm esta lista — trate como vazia. */
  pedidos?: PedidoAula[];
}

export interface NovaContaAluno {
  nome: string;
  preferencias: PreferenciasTreino;
}

/** Situação da conta neste aparelho. */
export type SituacaoConta =
  | "carregando"
  | "sem-conta"
  /** Tem conta salva, mas o perfil sumiu do store (backup restaurado, dados limpos). */
  | "perfil-perdido"
  | "pronta";

interface AlunoAppContextValue {
  conta: ContaAluno | null;
  aluno: Aluno | undefined;
  situacao: SituacaoConta;
  /** Personal que acompanha o aluno hoje. Sem vínculo, fica indefinido. */
  personal: PersonalPublico | undefined;
  /** Atalho: o treino é montado por um personal, não pelo gerador. */
  vinculado: boolean;
  /** Encerra o acompanhamento — o aluno volta a montar o próprio treino. */
  desvincular: () => void;
  criarConta: (dados: NovaContaAluno) => ContaAluno;
  /**
   * Regera a planilha com as mesmas preferências, variando os exercícios.
   * Não faz nada com personal vinculado — quem manda no treino é ele.
   */
  gerarOutroTreino: () => void;
  /** Salva novas preferências e monta um treino novo em cima delas. */
  atualizarPreferencias: (preferencias: PreferenciasTreino) => void;
  /** Recria o perfil no store a partir da conta salva (caso "perfil-perdido"). */
  recriarPerfil: () => void;
  apagarConta: () => void;
  /** Pedidos de aula experimental já enviados pelo catálogo. */
  pedidos: PedidoAula[];
  registrarPedido: (pedido: PedidoAula) => void;
}

const AlunoAppContext = createContext<AlunoAppContextValue | null>(null);

/**
 * O que o personal vê no campo "modalidade" do cadastro. O esporte entra junto
 * porque muda tudo pra quem for pegar esse aluno: quem luta 3x na semana não
 * pode receber a mesma planilha de quem só faz academia.
 */
function rotuloModalidade(prefs: PreferenciasTreino): string {
  const base = prefs.local === "casa" ? "Treino em casa" : "Musculação";
  return prefs.esporte ? `${base} + ${prefs.esporte.nome}` : base;
}

function lerConta(): ContaAluno | null {
  try {
    const raw = localStorage.getItem(CONTA_KEY);
    return raw ? (JSON.parse(raw) as ContaAluno) : null;
  } catch {
    return null;
  }
}

export function AlunoAppProvider({ children }: { children: ReactNode }) {
  const {
    addAluno,
    updateAluno,
    removeAluno,
    getAluno,
    addTreino,
    updateTreino,
    biblioteca,
    perfilPublicoPorEmail,
  } = useStore();
  const [conta, setConta] = useState<ContaAluno | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Hidratação no client, depois do render SSR-safe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConta(lerConta());
    setCarregando(false);
  }, []);

  const aluno = conta ? getAluno(conta.alunoId) : undefined;
  // O vínculo mora no próprio cadastro: o personal o assume ao converter o lead.
  const personal = aluno?.personalEmail
    ? perfilPublicoPorEmail(aluno.personalEmail)
    : undefined;
  const vinculado = Boolean(aluno?.personalEmail);

  const situacao: SituacaoConta = carregando
    ? "carregando"
    : !conta
      ? "sem-conta"
      : aluno
        ? "pronta"
        : "perfil-perdido";

  const value = useMemo<AlunoAppContextValue>(() => {
    const persistir = (nova: ContaAluno | null) => {
      setConta(nova);
      if (nova) localStorage.setItem(CONTA_KEY, JSON.stringify(nova));
      else localStorage.removeItem(CONTA_KEY);
    };

    /** Cria o Treino no store a partir das preferências. */
    const montarTreino = (alunoId: string, prefs: PreferenciasTreino, variacao: number): Treino => {
      const plano = gerarPlano(prefs, biblioteca, variacao);
      const treino = addTreino(alunoId, plano.nome, plano.descricao);
      updateTreino(treino.id, { divisoes: plano.divisoes });
      return treino;
    };

    /** Cria o Aluno marcado como conta de app. */
    const montarPerfil = (dados: NovaContaAluno): Aluno =>
      addAluno({
        nome: dados.nome.trim(),
        objetivo: dados.preferencias.objetivo,
        modalidade: rotuloModalidade(dados.preferencias),
        contaApp: true,
      });

    return {
      conta,
      aluno,
      situacao,
      personal,
      vinculado,
      desvincular: () => {
        if (!conta || !aluno) return;
        updateAluno(conta.alunoId, { personalEmail: undefined });
      },
      criarConta: (dados) => {
        const perfil = montarPerfil(dados);
        montarTreino(perfil.id, dados.preferencias, 0);
        const nova: ContaAluno = {
          alunoId: perfil.id,
          nome: perfil.nome,
          preferencias: dados.preferencias,
          variacao: 0,
          criadaEm: new Date().toISOString(),
        };
        persistir(nova);
        return nova;
      },
      gerarOutroTreino: () => {
        if (!conta || !aluno || vinculado) return;
        const variacao = conta.variacao + 1;
        montarTreino(conta.alunoId, conta.preferencias, variacao);
        persistir({ ...conta, variacao });
      },
      atualizarPreferencias: (preferencias) => {
        if (!conta || !aluno) return;
        updateAluno(conta.alunoId, {
          objetivo: preferencias.objetivo,
          modalidade: rotuloModalidade(preferencias),
        });
        // Com personal, a mudança de preferência é recado pra ele — a planilha
        // dele não pode ser sobrescrita por um treino gerado.
        if (vinculado) {
          persistir({ ...conta, preferencias });
          return;
        }
        const variacao = conta.variacao + 1;
        montarTreino(conta.alunoId, preferencias, variacao);
        persistir({ ...conta, preferencias, variacao });
      },
      recriarPerfil: () => {
        if (!conta) return;
        const perfil = montarPerfil({ nome: conta.nome, preferencias: conta.preferencias });
        montarTreino(perfil.id, conta.preferencias, conta.variacao);
        persistir({ ...conta, alunoId: perfil.id });
      },
      apagarConta: () => {
        if (conta && aluno) removeAluno(conta.alunoId);
        persistir(null);
      },
      pedidos: conta?.pedidos ?? [],
      registrarPedido: (pedido) => {
        if (!conta) return;
        const anteriores = (conta.pedidos ?? []).filter(
          (item) => item.personalPublicoId !== pedido.personalPublicoId,
        );
        persistir({ ...conta, pedidos: [pedido, ...anteriores] });
      },
    };
  }, [
    conta,
    aluno,
    situacao,
    personal,
    vinculado,
    biblioteca,
    addAluno,
    updateAluno,
    removeAluno,
    addTreino,
    updateTreino,
  ]);

  return <AlunoAppContext.Provider value={value}>{children}</AlunoAppContext.Provider>;
}

export function useAlunoApp(): AlunoAppContextValue {
  const ctx = useContext(AlunoAppContext);
  if (!ctx) throw new Error("useAlunoApp precisa estar dentro de <AlunoAppProvider>");
  return ctx;
}
