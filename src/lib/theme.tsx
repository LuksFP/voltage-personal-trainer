"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Tema = "dark" | "light";

interface ThemeContextValue {
  tema: Tema;
  alternar: () => void;
  definir: (t: Tema) => void;
}

const THEME_KEY = "pt.theme.v1";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function aplicar(t: Tema) {
  document.documentElement.setAttribute("data-theme", t);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>("dark");

  // Lê a preferência salva na montagem (o script inline no <head> já evitou o flash)
  useEffect(() => {
    const salvo = (localStorage.getItem(THEME_KEY) as Tema | null) ?? "dark";
    // Hidratação inicial do localStorage no client, depois do render SSR-safe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTema(salvo);
    aplicar(salvo);
  }, []);

  const definir = useCallback((t: Tema) => {
    setTema(t);
    aplicar(t);
    localStorage.setItem(THEME_KEY, t);
  }, []);

  const alternar = useCallback(() => {
    definir(tema === "dark" ? "light" : "dark");
  }, [tema, definir]);

  return (
    <ThemeContext.Provider value={{ tema, alternar, definir }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme precisa estar dentro de <ThemeProvider>");
  return ctx;
}
