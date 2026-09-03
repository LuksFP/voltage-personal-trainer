import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Mantém a sessão do Supabase viva renovando o cookie a cada navegação.
 *
 * De propósito NÃO faz gate de rota. Três motivos:
 *  - `/app` e `/portal` são do aluno e precisam continuar abertos;
 *  - a sessão de demonstração vive no localStorage, invisível aqui no
 *    servidor — um redirect cego mandaria a demo pro login pra sempre;
 *  - o dado do personal ainda mora no navegador; quando for pro banco, quem
 *    protege é a RLS, não um redirect.
 *
 * O gate de interface segue no AppFrame, que enxerga as duas sessões.
 */
export async function atualizarSessao(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // A chamada em si é o que dispara o refresh do token; o usuário não
  // interessa aqui.
  await supabase.auth.getUser();

  return supabaseResponse;
}
