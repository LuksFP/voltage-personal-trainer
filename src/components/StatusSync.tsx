"use client";

import { useSync } from "@/lib/store";

/**
 * Diz em que pé está o dado. O personal precisa saber a diferença entre
 * "está na minha conta, abre em qualquer aparelho" e "isso aqui é só neste
 * navegador" — sem isso ele confia num dado que pode sumir.
 */
export function StatusSync() {
  const sync = useSync();

  if (sync.estado === "pronto" || sync.estado === "salvando") {
    const salvando = sync.estado === "salvando";
    return (
      <p className="flex items-center gap-2 text-xs text-muted" aria-live="polite">
        <span
          className={`h-1.5 w-1.5 rounded-full bg-accent ${salvando ? "animate-pulse" : ""}`}
        />
        {salvando ? "Salvando…" : "Salvo na sua conta"}
      </p>
    );
  }

  if (sync.estado === "carregando") {
    return (
      <p className="flex items-center gap-2 text-xs text-muted" aria-live="polite">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" />
        Carregando sua conta…
      </p>
    );
  }

  if (sync.estado === "conflito") {
    return (
      <div className="rounded-lg border border-danger/40 bg-danger/10 p-2.5" role="alert">
        <p className="text-xs font-semibold text-danger">Aberto em outro aparelho</p>
        <p className="mt-1 text-xs text-muted">
          Lá foi salvo algo mais novo. Recarregue pra pegar a versão certa — a
          gravação daqui está pausada pra não apagar aquilo.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 w-full rounded-lg border border-line py-1.5 text-xs font-semibold transition-colors hover:border-danger/50 hover:text-danger"
        >
          Recarregar
        </button>
      </div>
    );
  }

  if (sync.estado === "erro") {
    return (
      <div className="rounded-lg border border-danger/40 bg-danger/10 p-2.5" role="alert">
        <p className="text-xs font-semibold text-danger">Sem conexão com sua conta</p>
        <p className="mt-1 text-xs text-muted">
          O que você mudar agora fica só neste aparelho até voltar.
        </p>
      </div>
    );
  }

  // estado "local": demonstração ou sem login.
  return (
    <p className="flex items-center gap-2 text-xs text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-muted" />
      Só neste navegador
    </p>
  );
}
