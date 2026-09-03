import { createClient } from "./supabase/client";

/**
 * Só o que este módulo precisa enxergar do estado. Importar `StoreData` de
 * store.tsx faria ciclo (a store é quem importa daqui).
 */
interface EstadoVersionado {
  schemaVersion?: number;
}

/**
 * Sincronização do estado do app com o Supabase.
 *
 * O app sempre carregou tudo de uma vez e gravou o objeto inteiro num ponto
 * só (`localStorage.setItem`), então a nuvem espelha exatamente isso: uma
 * linha por personal em `app_estado`, com o documento em JSONB. É o que dá
 * multi-dispositivo sem reescrever as 150+ operações da store.
 */

export interface EstadoNaNuvem {
  dados: unknown;
  atualizadoEm: string;
}

/** Lê o documento do personal. `null` = conta nova, sem nada salvo ainda. */
export async function carregarDaNuvem(
  personalId: string,
): Promise<{ ok: true; estado: EstadoNaNuvem | null } | { ok: false; erro: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("app_estado")
    .select("dados, atualizado_em")
    .eq("personal_id", personalId)
    .maybeSingle();

  if (error) return { ok: false, erro: error.message };
  if (!data) return { ok: true, estado: null };
  return {
    ok: true,
    estado: { dados: data.dados, atualizadoEm: data.atualizado_em as string },
  };
}

/** Grava o documento inteiro. Devolve o novo `atualizado_em` do servidor. */
export async function salvarNaNuvem<T extends EstadoVersionado>(
  personalId: string,
  dados: T,
): Promise<{ ok: true; atualizadoEm: string } | { ok: false; erro: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("app_estado")
    .upsert(
      {
        personal_id: personalId,
        dados,
        schema_version: dados.schemaVersion ?? 0,
        // Update não dispara `default now()`; o trigger cobre, mas mandar
        // explícito mantém o insert e o update com a mesma semântica.
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "personal_id" },
    )
    .select("atualizado_em")
    .single();

  if (error) return { ok: false, erro: error.message };
  return { ok: true, atualizadoEm: data.atualizado_em as string };
}

/**
 * Quando outro aparelho gravou depois de esta aba ter carregado.
 *
 * Sem isso, abrir o app no celular e no PC ao mesmo tempo faria a aba parada
 * sobrescrever com um estado velho o que a outra acabou de salvar.
 */
export async function houveEscritaMaisNova(
  personalId: string,
  carregadoEm: string | null,
): Promise<boolean> {
  if (!carregadoEm) return false;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("app_estado")
    .select("atualizado_em")
    .eq("personal_id", personalId)
    .maybeSingle();

  if (error || !data) return false; // na dúvida, não trava a gravação
  return new Date(data.atualizado_em as string).getTime() > new Date(carregadoEm).getTime();
}
