import type { Metadata, Viewport } from "next";
import { AlunoAppProvider } from "@/lib/aluno-app";

export const metadata: Metadata = {
  title: "Voltage — seu treino",
  description: "Monte seu treino, registre cada série e acompanhe sua evolução.",
  manifest: "/app/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Voltage", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#c6f24e",
  // Barra de navegação do celular acompanha o fundo do app.
  viewportFit: "cover",
};

export default function AlunoAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AlunoAppProvider>
      {children}
    </AlunoAppProvider>
  );
}
