import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Volta do Google. O provedor devolve um `code` que precisa ser trocado pela
 * sessão aqui no servidor — é essa troca que grava os cookies que o
 * middleware lê depois.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const destinoBruto = searchParams.get("destino") ?? "/";

  // Só aceita caminho interno: `destino` vem da URL e um "//evil.com" viraria
  // redirect pra fora.
  const destino =
    destinoBruto.startsWith("/") && !destinoBruto.startsWith("//") ? destinoBruto : "/";

  if (!code) {
    const erro = searchParams.get("error_description") ?? searchParams.get("error");
    return NextResponse.redirect(
      `${origin}/login?erro=${encodeURIComponent(erro ?? "Login cancelado.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?erro=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${destino}`);
}
