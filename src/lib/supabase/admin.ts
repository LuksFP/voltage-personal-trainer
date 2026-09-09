import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente com a service role. **Só pode ser importado por código de servidor.**
 *
 * Esta chave ignora a RLS inteira do projeto: com ela dá pra ler e escrever o
 * documento de qualquer personal. Ela existe aqui por um motivo só — o aluno
 * do portal é anônimo, não tem sessão pra RLS avaliar, então quem decide o que
 * ele pode ver é o handler, depois de trocar o token pelo par (personal, aluno).
 *
 * O guarda abaixo é o cinto de segurança: se um dia alguém importar este módulo
 * de um componente de cliente, o erro estoura no desenvolvimento em vez de a
 * chave ir junto no bundle.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("O cliente de service role não pode rodar no navegador.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.",
    );
  }

  return createSupabaseClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
