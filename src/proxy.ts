import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

/**
 * No Next 16 o antigo `middleware.ts` virou `proxy.ts` — o nome velho está
 * deprecado (ver node_modules/next/dist/docs/.../file-conventions/proxy.md).
 */
export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  matcher: [
    /*
     * Tudo, menos estáticos e arquivos com extensão (sw.js, manifest, ícones).
     * Sem o filtro, o proxy rodaria até em CSS e imagem.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)",
  ],
};
