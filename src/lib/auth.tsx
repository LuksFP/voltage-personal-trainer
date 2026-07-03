"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface Personal {
  nome: string;
  email: string;
  bio?: string;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [personal, setPersonal] = useState<Personal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setPersonal(JSON.parse(raw) as Personal);
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
        persistirSessao({ nome: conta.nome, email: conta.email, bio: conta.bio });
        return { ok: true };
      },
      entrarDemo: () => {
        const demo: Personal = { nome: "Personal Demo", email: "demo@voltage.app" };
        const contas = lerContas();
        if (!contas.some((c) => c.email === demo.email)) {
          salvarContas([...contas, { ...demo, senha: "demo" }]);
        }
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
