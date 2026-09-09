"use client";

import { useParams } from "next/navigation";
import { StoreProvider } from "@/lib/store";
import { ehTokenPortal } from "@/lib/portal-token";

/**
 * O portal roda com um store próprio.
 *
 * O provider do layout raiz serve o personal logado (nuvem ou localStorage
 * deste navegador) — e é justamente o que o celular do aluno não tem. Aqui o
 * dado vem do route handler, que troca o token do link pela fatia daquele
 * aluno.
 *
 * Link antigo, com o id do aluno em vez do token, continua caindo no provider
 * de cima: é o que faz o portal da demonstração funcionar sem banco.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ codigo: string }>();
  const codigo = params.codigo;

  if (!ehTokenPortal(codigo)) return <>{children}</>;

  return <StoreProvider fonte={{ tipo: "portal", token: codigo }}>{children}</StoreProvider>;
}
