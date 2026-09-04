-- ============================================================
-- search_path fixo no gatilho de app_estado
-- ============================================================
-- `tocar_app_estado` nasceu sem `set search_path` e o linter do Supabase
-- aponta isso. Ela roda como INVOCADOR (não é SECURITY DEFINER), então o risco
-- prático é baixo — mas com o search_path herdado da sessão, um schema
-- plantado na frente do `public` mudaria o que os nomes do corpo resolvem.
-- Fixar custa nada.
--
-- Aqui vai `= ''` (mais estrito que o `= public` do aluno_e_meu) porque o corpo
-- não toca em nada de `public`: só chama `now()`, que é qualificado abaixo.
-- Se um dia o corpo passar a ler uma tabela, ou qualifica o nome ou troca por
-- `set search_path = public`.
--
-- NÃO mexer no `aluno_e_meu`: `authenticated` precisa manter o EXECUTE, senão
-- as 16 policies que a chamam passam a dar ERRO DE PERMISSÃO em vez de negar a
-- linha, e o personal perde acesso aos próprios alunos. Ver a 0004.
create or replace function public.tocar_app_estado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = pg_catalog.now();
  return new;
end;
$$;
