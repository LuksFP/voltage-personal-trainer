"use client";

import Link from "next/link";
import { Suspense } from "react";
import { AuthScreen } from "@/components/AuthScreen";
import { BotaoGoogle } from "@/components/BotaoGoogle";

export default function CadastroPage() {
  return (
    <AuthScreen titulo="Criar sua conta">
      <p className="mb-6 text-sm text-muted">
        Sua conta usa o Google — não tem senha nova pra decorar. Na primeira
        entrada a gente já cria seu perfil de personal.
      </p>

      <Suspense fallback={<div className="h-12 animate-pulse rounded-xl bg-surface-2" />}>
        <BotaoGoogle rotulo="Criar conta com Google" />
      </Suspense>

      <p className="mt-6 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="font-semibold text-ink underline decoration-volt decoration-2 underline-offset-4"
        >
          Entrar
        </Link>
      </p>
    </AuthScreen>
  );
}
