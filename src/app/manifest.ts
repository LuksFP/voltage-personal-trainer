import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Voltage — seu treino",
    short_name: "Voltage",
    description:
      "Monte seu treino, registre cada série e acompanhe sua evolução — com ou sem personal.",
    // O app instalado abre direto no lado do aluno, não no painel do personal.
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c0e0b",
    theme_color: "#c6f24e",
    lang: "pt-BR",
    categories: ["health", "fitness", "sports"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
