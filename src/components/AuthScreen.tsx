"use client";

import type { CSSProperties, ReactNode } from "react";
import { DumbbellIcon } from "./icons";

// Sobrescreve os tokens de tema só nesta tela -> vira claro/branco,
// e os componentes de UI (Input, Button, Field) se adaptam sozinhos.
const temaClaro = {
  "--color-bg": "#ffffff",
  "--color-surface": "#ffffff",
  "--color-surface-2": "#f3f5ef",
  "--color-line": "#e4e7dd",
  "--color-text": "#14170f",
  "--color-muted": "#6a7360",
} as CSSProperties;

export function AuthScreen({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div style={temaClaro} className="grid min-h-screen bg-white text-[#14170f] lg:grid-cols-[1.05fr_1fr]">
      {/* Painel de marca em volt — some no mobile */}
      <aside className="relative hidden overflow-hidden bg-volt p-12 text-ink lg:flex lg:flex-col">
        <div className="absolute -right-20 -top-24 h-96 w-96 rounded-full bg-white/25 blur-3xl" />
        <div className="absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-black/5 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-accent">
            <DumbbellIcon className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">Voltage</span>
        </div>

        <div className="relative mt-auto">
          <h1 className="font-display text-5xl font-bold leading-[1.05]">
            Seus alunos e treinos,
            <br />
            num só lugar.
          </h1>
          <p className="mt-4 max-w-sm font-medium text-ink/70">
            Cadastre alunos, monte planilhas com séries, cargas e descanso, e acompanhe a evolução de cada um.
          </p>

          <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-ink/60">
            <span className="h-1.5 w-8 rounded-full bg-ink/40" />
            Gestão de personal trainer
          </div>
        </div>
      </aside>

      {/* Lado do formulário — branco */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-volt text-ink">
              <DumbbellIcon className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">Voltage</span>
          </div>

          <h2 className="font-display text-2xl font-bold">{titulo}</h2>
          <div className="mt-6">{children}</div>

          <p className="mt-8 text-center text-xs text-muted">
            Ambiente de demonstração — dados salvos apenas neste navegador.
          </p>
        </div>
      </main>
    </div>
  );
}
