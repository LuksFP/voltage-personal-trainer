"use client";

import { useTheme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./icons";

export function ThemeToggle({ full = false }: { full?: boolean }) {
  const { tema, alternar } = useTheme();
  const claro = tema === "light";

  if (full) {
    // Versão "linha" para a sidebar
    return (
      <button
        onClick={alternar}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-text"
        aria-label="Alternar tema"
      >
        <span className="flex items-center gap-2.5">
          {claro ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          {claro ? "Tema claro" : "Tema escuro"}
        </span>
        <span
          className={`relative h-5 w-9 rounded-full transition-colors ${claro ? "bg-volt" : "bg-surface-2"}`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
              claro ? "left-[1.15rem]" : "left-0.5"
            }`}
          />
        </span>
      </button>
    );
  }

  // Versão "ícone" para a topbar mobile
  return (
    <button
      onClick={alternar}
      className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition-colors hover:text-text"
      aria-label="Alternar tema"
    >
      {claro ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  );
}
