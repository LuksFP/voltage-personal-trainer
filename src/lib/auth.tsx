"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "./supabase/client";
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

interface AuthContextValue {
  personal: Personal | null;
  loading: boolean;
  /** id do usuário no Supabase — null na sessão de demonstração. */
  personalId: string | null;
  /** true quando a sessão é a demo local, sem banco por trás. */
  demo: boolean;
  entrarComGoogle: (destino?: string) => Promise<{ ok: boolean; erro?: string }>;
  entrarDemo: () => void;
  sair: () => Promise<void>;
  atualizarPerfil: (patch: Partial<Personal>) => Promise<void>;
}

/**
 * A demo continua 100% local: serve pra mostrar o app funcionando sem
 * depender do Google nem gravar nada no banco. A sessão do Supabase tem
 * precedência — se as duas existirem, vale a real.
 */
const DEMO_KEY = "pt.session.demo.v1";

const DEMO: Personal = {
  nome: "Personal Demo",
  email: "demo@voltage.app",
  pixChave: "8f2c1e4a-9d3b-4c77-a5e1-6b0d2f7a9c31",
  pixTipo: "aleatoria",
  pixNome: "Personal Demo",
  pixCidade: "Guaruja",
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Linha de `personais` como ela vem do banco (snake_case). */
interface LinhaPersonal {
  nome: string | null;
  email: string | null;
  bio: string | null;
  pix_chave: string | null;
  pix_tipo: string | null;
  pix_nome: string | null;
  pix_cidade: string | null;
  documento: string | null;
}

function daLinha(linha: LinhaPersonal, emailFallback: string): Personal {
  // Descarta os nulos: o resto do app trata os opcionais como `undefined`
  // (`pixChave && ...`), e um `null` vazando quebraria essas checagens.
  const limpo = <T,>(v: T | null): T | undefined => v ?? undefined;
  return {
    nome: linha.nome ?? "",
    email: linha.email ?? emailFallback,
    bio: limpo(linha.bio),
    pixChave: limpo(linha.pix_chave),
    pixTipo: limpo(linha.pix_tipo) as TipoChavePix | undefined,
    pixNome: limpo(linha.pix_nome),
    pixCidade: limpo(linha.pix_cidade),
    documento: limpo(linha.documento),
  };
}

const COLUNA: Record<keyof Personal, string> = {
  nome: "nome",
  email: "email",
  bio: "bio",
  pixChave: "pix_chave",
  pixTipo: "pix_tipo",
  pixNome: "pix_nome",
  pixCidade: "pix_cidade",
  documento: "documento",
};

/**
 * Só manda pro banco o que veio no patch — campo ausente fica como está.
 *
 * A checagem é por chave presente (`in`), não por valor definido: o card do
 * Pix limpa a chave mandando `pixChave: undefined` de propósito, e testar
 * `!== undefined` faria esse "apagar" virar um silencioso não-fazer-nada.
 */
function paraLinha(patch: Partial<Personal>): Record<string, string | null> {
  const saida: Record<string, string | null> = {};
  for (const chave of Object.keys(patch) as (keyof Personal)[]) {
    const coluna = COLUNA[chave];
    if (!coluna) continue;
    const valor = patch[chave];
    saida[coluna] = valor === undefined || valor === "" ? null : valor;
  }
  return saida;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [personal, setPersonal] = useState<Personal | null>(null);
  const [personalId, setPersonalId] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  const carregarPerfil = useCallback(
    async (id: string, email: string): Promise<Personal> => {
      const { data, error } = await supabase
        .from("personais")
        .select("nome, email, bio, pix_chave, pix_tipo, pix_nome, pix_cidade, documento")
        .eq("id", id)
        .maybeSingle();

      // O perfil nasce por trigger no signup. Se por algum motivo não existir
      // (trigger falhou, usuário criado antes dela), cria na hora — sem isso
      // a FK de `alunos` derruba tudo que o personal tentar salvar.
      if (error || !data) {
        await supabase.from("personais").upsert({ id, email }, { onConflict: "id" });
        return { nome: "", email };
      }
      return daLinha(data as LinhaPersonal, email);
    },
    [supabase],
  );

  useEffect(() => {
    let vivo = true;

    const aplicar = async (
      usuario: { id: string; email?: string } | null | undefined,
    ) => {
      if (!vivo) return;
      if (usuario) {
        const perfil = await carregarPerfil(usuario.id, usuario.email ?? "");
        if (!vivo) return;
        setPersonal(perfil);
        setPersonalId(usuario.id);
        setDemo(false);
      } else {
        // Sem sessão no Supabase: cai pra demo local, se houver.
        const temDemo = (() => {
          try {
            return localStorage.getItem(DEMO_KEY) !== null;
          } catch {
            return false;
          }
        })();
        setPersonal(temDemo ? DEMO : null);
        setPersonalId(null);
        setDemo(temDemo);
      }
      setLoading(false);
    };

    void supabase.auth.getUser().then(({ data }) => aplicar(data.user));

    // Cobre o retorno do Google (o callback troca o code por sessão) e o
    // refresh de token em aba aberta.
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      void aplicar(sessao?.user ?? null);
    });

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, carregarPerfil]);

  const value = useMemo<AuthContextValue>(
    () => ({
      personal,
      personalId,
      demo,
      loading,
      entrarComGoogle: async (destino = "/") => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback?destino=${encodeURIComponent(destino)}`,
          },
        });
        if (error) return { ok: false, erro: error.message };
        return { ok: true }; // o navegador já está saindo pro Google
      },
      entrarDemo: () => {
        try {
          localStorage.setItem(DEMO_KEY, "1");
        } catch {
          /* modo privado: a demo vale só enquanto a aba viver */
        }
        setPersonal(DEMO);
        setPersonalId(null);
        setDemo(true);
      },
      sair: async () => {
        try {
          localStorage.removeItem(DEMO_KEY);
        } catch {
          /* ignora */
        }
        setPersonal(null);
        setPersonalId(null);
        setDemo(false);
        await supabase.auth.signOut();
      },
      atualizarPerfil: async (patch) => {
        if (!personal) return;
        const atualizado = { ...personal, ...patch };
        setPersonal(atualizado); // otimista: a UI do perfil responde na hora
        if (demo || !personalId) return; // demo não toca no banco
        const linha = paraLinha(patch);
        if (Object.keys(linha).length === 0) return;
        const { error } = await supabase
          .from("personais")
          .update(linha)
          .eq("id", personalId);
        if (error) {
          // Não desfaz a tela por conta própria — só registra, pra não
          // apagar o que o personal acabou de digitar.
          console.error("Não foi possível salvar o perfil:", error.message);
        }
      },
    }),
    [personal, personalId, demo, loading, supabase],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
