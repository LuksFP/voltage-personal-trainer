import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O selo de dev fica no canto inferior esquerdo, bem em cima da aba "Hoje"
  // da barra do app — em dev não dava pra clicar nela. Erros de compilação e
  // runtime continuam aparecendo normalmente.
  devIndicators: false,
};

export default nextConfig;
