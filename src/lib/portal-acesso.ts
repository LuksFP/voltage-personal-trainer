import { createClient } from "./supabase/client";

/**
 * O link do portal do aluno.
 *
 * O aluno não tem login: o que prova quem ele é, é o segredo no link. Por isso
 * o token é o único dado do sistema que trafega em texto puro numa URL — e por
 * isso ele é longo, aleatório e trocável.
 *
 * O índice token → (personal, aluno) mora na tabela `portal_acesso`, fora do
 * documento JSONB, porque o servidor precisa resolver o token ANTES de saber
 * de qual personal é o documento (ver a migration 0007).
 */

/** 128 bits em hex. Aleatoriedade do sistema, nunca `Math.random`. */
export function gerarTokenPortal(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Registra (ou reemite) o acesso do aluno.
 *
 * Roda no navegador do personal autenticado, então a RLS já garante que ele só
 * escreve acesso de aluno dele. O `onConflict` é o par (personal, aluno): um
 * aluno tem um token por vez, e reemitir invalida o link anterior em vez de
 * deixar dois valendo.
 */
export async function publicarAcessoPortal(
  personalId: string,
  alunoId: string,
  token: string,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("portal_acesso")
    .upsert(
      { token, personal_id: personalId, aluno_id: alunoId },
      { onConflict: "personal_id,aluno_id" },
    );

  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}
