import type { MetadataRoute } from "next";

/**
 * Manifest do APP DO ALUNO.
 *
 * Vive numa rota própria (e não no `manifest.ts` da raiz, que já é o do painel)
 * porque a convenção do Next só gera um manifest por app. O `scope` fechado em
 * "/app" é de propósito: instalado, o que for pro painel abre no navegador em
 * vez de entrar na janela do aluno.
 */
const manifest: MetadataRoute.Manifest = {
  id: "/app",
  name: "Voltage — seu treino",
  short_name: "Voltage",
  description:
    "Monte seu treino, registre cada série e acompanhe sua evolução — com ou sem personal.",
  start_url: "/app",
  scope: "/app",
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

export function GET() {
  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
