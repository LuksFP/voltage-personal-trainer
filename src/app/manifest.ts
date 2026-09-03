import type { MetadataRoute } from "next";

/**
 * Manifest do PAINEL DO PERSONAL (raiz).
 *
 * São dois PWAs no mesmo domínio: este e o do aluno (/app/manifest.webmanifest).
 * O que os separa pro navegador é o par `id` + `start_url` — sem `id` distinto,
 * instalar um sobrescreve o outro na mesma origem.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Voltage — Personal",
    short_name: "Voltage Personal",
    description:
      "Seus alunos, planilhas, agenda e financeiro num só lugar — na academia, no celular.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0c0e0b",
    theme_color: "#c6f24e",
    lang: "pt-BR",
    categories: ["business", "productivity", "health"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Agenda de hoje", url: "/agenda" },
      { name: "Alunos", url: "/alunos" },
      { name: "Financeiro", url: "/financeiro" },
    ],
  };
}
