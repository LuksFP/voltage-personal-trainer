"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "@/lib/auth";
import { AuthScreen } from "@/components/AuthScreen";
import { BotaoGoogle } from "@/components/BotaoGoogle";
import { Button } from "@/components/ui";

function Conteudo() {
  const { entrarDemo } = useAuth();
  const router = useRouter();

  return (
    <>
      <BotaoGoogle rotulo="Entrar com Google" />

      <div className="mt-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        ou
        <span className="h-px flex-1 bg-line" />
      </div>

      <Button
        variant="outline"
        className="mt-6 w-full"
        onClick={() => {
          entrarDemo();
          router.replace("/");
        }}
      >
        Entrar como demonstração
      </Button>
      <p className="mt-2 text-center text-xs text-muted">
        A demonstração fica só neste navegador e não grava nada na sua conta.
      </p>

      <p className="mt-6 text-center text-sm text-muted">
        É a primeira vez?{" "}
        <Link
          href="/cadastro"
          className="font-semibold text-ink underline decoration-volt decoration-2 underline-offset-4"
        >
          Criar conta
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthScreen titulo="Entrar na sua conta">
      {/* useSearchParams (leitura do ?erro=) exige limite de Suspense. */}
      <Suspense fallback={<div className="h-12 animate-pulse rounded-xl bg-surface-2" />}>
        <Conteudo />
      </Suspense>
    </AuthScreen>
  );
}
