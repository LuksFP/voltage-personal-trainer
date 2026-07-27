"use client";

import { useEffect } from "react";

/** Registra o service worker só em produção — em dev ele atrapalha o hot reload. */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((erro: unknown) => {
      console.warn("Service worker não registrado:", erro);
    });
  }, []);

  return null;
}
