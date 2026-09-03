-- ============================================================
-- Fase 0 — login de verdade (Google) e perfil do personal
-- ============================================================
-- Até aqui `personais` só tinha id/nome/email, mas o app carrega um perfil
-- bem maior (bio, dados de Pix, documento do recibo) que vivia só no
-- localStorage. Estas colunas são o espelho do type `Personal` do auth.tsx.

alter table public.personais
  add column if not exists bio        text,
  add column if not exists pix_chave  text,
  add column if not exists pix_tipo   text,
  add column if not exists pix_nome   text,
  add column if not exists pix_cidade text,
  add column if not exists documento  text;

-- O `nome` vinha `not null`, mas no login com Google a linha nasce por
-- trigger e o provedor nem sempre manda um nome. Deixa nulo e a UI pede.
alter table public.personais alter column nome drop not null;

-- ------------------------------------------------------------
-- Linha de perfil criada junto com o usuário
-- ------------------------------------------------------------
-- Sem isto, quem entra com Google fica autenticado e sem perfil: a RLS de
-- `alunos` exige personal_id = auth.uid(), e a FK aponta pra `personais`.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.personais (id, nome, email)
  values (
    new.id,
    -- Google manda em full_name; outros provedores usam name. Nulo é aceito.
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', '')
    ),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Só o trigger chama esta função; ninguém precisa dela pela API REST.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Quem já existe em auth.users mas não tem perfil (não deve haver ninguém
-- ainda, mas torna a migration segura de rodar em qualquer ordem).
-- ------------------------------------------------------------
insert into public.personais (id, nome, email)
select u.id,
       coalesce(
         nullif(u.raw_user_meta_data ->> 'full_name', ''),
         nullif(u.raw_user_meta_data ->> 'name', '')
       ),
       u.email
from auth.users u
left join public.personais p on p.id = u.id
where p.id is null;

-- ------------------------------------------------------------
-- Fecha o buraco que o linter apontou: `PUBLIC` ainda tinha EXECUTE em
-- aluno_e_meu, então o revoke de `anon` da 0003 não surtiu efeito nenhum.
-- `authenticated` continua com acesso porque as 16 policies dependem disso.
-- ------------------------------------------------------------
revoke execute on function public.aluno_e_meu(uuid) from public;
