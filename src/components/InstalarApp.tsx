"use client";

import { useEffect, useState } from "react";
import { DownloadIcon, XIcon } from "@/components/icons";

/** Evento não-padrão do Chrome/Edge — tipado à mão porque o TS não traz. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISPENSADO_KEY = "pt.aluno.instalar-dispensado.v1";

export function InstalarApp() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISPENSADO_KEY) === "1") return;
    // Já está rodando instalado: não faz sentido oferecer.
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const aoReceber = (e: Event) => {
      e.preventDefault();
      setEvento(e as BeforeInstallPromptEvent);
      setVisivel(true);
    };
    window.addEventListener("beforeinstallprompt", aoReceber);
    return () => window.removeEventListener("beforeinstallprompt", aoReceber);
  }, []);

  if (!visivel || !evento) return null;

  const dispensar = () => {
    localStorage.setItem(DISPENSADO_KEY, "1");
    setVisivel(false);
  };

  const instalar = async () => {
    await evento.prompt();
    const escolha = await evento.userChoice;
    if (escolha.outcome === "accepted") setVisivel(false);
    else dispensar();
  };

  return (
    <section className="flex items-center gap-3 rounded-xl2 border border-volt/30 bg-volt/8 px-4 py-3.5">
      <DownloadIcon className="h-5 w-5 shrink-0 text-volt" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Instala o Voltage no seu celular</p>
        <p className="text-sm text-muted">Abre direto, sem navegador, e funciona offline.</p>
      </div>
      <button
        type="button"
        onClick={() => void instalar()}
        className="shrink-0 rounded-lg bg-volt px-3 py-2 text-sm font-bold text-ink"
      >
        Instalar
      </button>
      <button
        type="button"
        onClick={dispensar}
        aria-label="Dispensar convite de instalação"
        className="shrink-0 text-muted hover:text-text"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </section>
  );
}
