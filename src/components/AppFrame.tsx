"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Shell } from "./Shell";
import { DumbbellIcon } from "./icons";

const ROTAS_PUBLICAS = ["/login", "/cadastro"];

export function AppFrame({ children }: { children: React.ReactNode }) {
  const { personal, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const publica = ROTAS_PUBLICAS.includes(pathname);
  // Rotas do aluno: abertas, sem login do personal e fora do Shell.
  // A raiz é o app do aluno; `/portal` é o link que o personal manda e `/app`
  // é o endereço antigo do app, que só redireciona pra raiz.
  const doAluno =
    pathname === "/" || pathname.startsWith("/portal") || pathname.startsWith("/app");

  useEffect(() => {
    if (loading || doAluno) return;
    if (!personal && !publica) router.replace("/login");
    if (personal && publica) router.replace("/painel");
  }, [personal, loading, publica, doAluno, router]);

  // O lado do aluno não depende da sessão do personal — renderiza direto.
  if (doAluno) return <>{children}</>;

  // Enquanto hidrata a sessão, evita "flash" de conteúdo protegido
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <span className="grid h-12 w-12 animate-pulse place-items-center rounded-2xl bg-volt text-ink">
          <DumbbellIcon className="h-6 w-6" />
        </span>
      </div>
    );
  }

  if (publica) return <>{children}</>;

  if (!personal) return null; // redirecionando para /login

  return <Shell>{children}</Shell>;
}
