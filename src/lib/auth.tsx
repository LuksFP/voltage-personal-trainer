"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TipoChavePix } from "./pix";

export interface Personal {
  nome: string;
  email: string;
  bio?: string;
  /** Recebimento por Pix — usado pra montar o copia-e-cola das mensalidades. */
  pixChave?: string;
  pixTipo?: TipoChavePix;
  /** Nome e cidade que aparecem no app do banco do aluno. */
  pixNome?: string;
  pixCidade?: string;
  /** CPF/CNPJ impresso no recibo (opcional). */
  documento?: string;
}

interface Conta extends Personal {
  senha: string; // MOCK: apenas para simular login local. NÃO usar assim com backend real.
}

interface AuthContextValue {
  personal: Personal | null;
  loading: boolean;
  entrar: (email: string, senha: string) => { ok: boolean; erro?: string };
  entrarDemo: () => void;
  cadastrar: (nome: string, email: string, senha: string) => { ok: boolean; erro?: string };
  sair: () => void;
  atualizarPerfil: (patch: Partial<Personal>) => void;
}

const SESSION_KEY = "pt.session.v1";
const CONTAS_KEY = "pt.contas.v1";

const AuthContext = createContext<AuthContextValue | null>(null);

function lerContas(): Conta[] {
  try {
    return JSON.parse(localStorage.getItem(CONTAS_KEY) ?? "[]") as Conta[];
  } catch {
    return [];
  }
}
function salvarContas(contas: Conta[]) {
  localStorage.setItem(CONTAS_KEY, JSON.stringify(contas));
}

/** A sessão guarda o perfil inteiro menos a senha — campos novos entram junto. */
function semSenha(conta: Conta): Personal {
  const copia: Partial<Conta> = { ...conta };
  delete copia.senha;
  return copia as Personal;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [personal, setPersonal] = useState<Personal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        // Hidratação inicial do localStorage no client, depois do render SSR-safe.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPersonal(JSON.parse(raw) as Personal);
      }
    } catch {
      /* ignora */
    }
    setLoading(false);
  }, []);

  const persistirSessao = (p: Personal | null) => {
    setPersonal(p);
    if (p) localStorage.setItem(SESSION_KEY, JSON.stringify(p));
    else localStorage.removeItem(SESSION_KEY);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      personal,
      loading,
      entrar: (email, senha) => {
        const conta = lerContas().find((c) => c.email.toLowerCase() === email.trim().toLowerCase());
        if (!conta) return { ok: false, erro: "E-mail não cadastrado." };
        if (conta.senha !== senha) return { ok: false, erro: "Senha incorreta." };
        // Tudo menos a senha entra na sessão (inclui Pix, documento, bio).
        persistirSessao(semSenha(conta));
        return { ok: true };
      },
      entrarDemo: () => {
        // A conta de demonstração já vem com Pix configurado (chave fictícia)
        // pra mostrar a cobrança e o recibo funcionando de ponta a ponta.
        const demo: Personal = {
          nome: "Personal Demo",
          email: "demo@voltage.app",
          pixChave: "8f2c1e4a-9d3b-4c77-a5e1-6b0d2f7a9c31",
          pixTipo: "aleatoria",
          pixNome: "Personal Demo",
          pixCidade: "Guaruja",
        };
        const contas = lerContas();
        const existente = contas.find((c) => c.email === demo.email);
        // Conta de demo criada antes do Pix existir não fica pra trás.
        salvarContas(
          existente
            ? contas.map((c) => (c.email === demo.email ? { ...c, ...demo } : c))
            : [...contas, { ...demo, senha: "demo" }],
        );
        persistirSessao(demo);
      },
      cadastrar: (nome, email, senha) => {
        const contas = lerContas();
        const emailNorm = email.trim().toLowerCase();
        if (contas.some((c) => c.email.toLowerCase() === emailNorm)) {
          return { ok: false, erro: "Já existe uma conta com esse e-mail." };
        }
        const conta: Conta = { nome: nome.trim(), email: email.trim(), senha };
        salvarContas([...contas, conta]);
        persistirSessao({ nome: conta.nome, email: conta.email });
        return { ok: true };
      },
      sair: () => persistirSessao(null),
      atualizarPerfil: (patch) => {
        if (!personal) return;
        const atualizado = { ...personal, ...patch };
        persistirSessao(atualizado);
        const contas = lerContas().map((c) =>
          c.email.toLowerCase() === personal.email.toLowerCase() ? { ...c, ...patch } : c,
        );
        salvarContas(contas);
      },
    }),
    [personal, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
