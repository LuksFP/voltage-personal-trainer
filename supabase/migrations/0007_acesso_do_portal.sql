-- ============================================================
-- Fase 2 — o portal do aluno passa a existir fora do navegador do personal
-- ============================================================
-- O dado do personal vive num documento JSONB por conta (`app_estado`), e o
-- aluno não tem login. O celular dele chega com um token secreto no link e
-- precisa, a partir SÓ desse token, descobrir de qual personal é o documento
-- e qual aluno ler dentro dele.
--
-- Esta tabela é esse índice: token → (personal, aluno). Fica de fora do JSONB
-- de propósito, porque é o único caminho de busca que o servidor tem antes de
-- saber de quem é o documento — varrer todos os `app_estado` atrás do token
-- seria O(n) em cima de documentos grandes.
--
-- Quem escreve aqui é o personal autenticado (RLS abaixo). O route handler lê
-- com service role, porque o aluno é anônimo — e é justamente por isso que a
-- leitura acontece no servidor, nunca no cliente: a service role ignora RLS e
-- não pode encostar no navegador de ninguém.
create table if not exists public.portal_acesso (
  token       text primary key,
  personal_id uuid not null references public.personais (id) on delete cascade,
  -- id do aluno DENTRO do documento JSONB, que é texto ("a1", uuid do app…),
  -- não uuid do banco — as tabelas relacionais não são a fonte de verdade hoje.
  aluno_id    text not null,
  criado_em   timestamptz not null default now(),
  -- Um token por aluno: reemitir troca a linha em vez de acumular link velho
  -- valendo (o `on conflict` do cliente depende desta unicidade).
  unique (personal_id, aluno_id)
);

create index if not exists portal_acesso_personal_idx
  on public.portal_acesso (personal_id);

alter table public.portal_acesso enable row level security;

-- O personal enxerga e mexe só nos próprios acessos. O aluno anônimo não tem
-- policy nenhuma: ele nunca fala com esta tabela direto, só pelo handler.
drop policy if exists portal_acesso_own on public.portal_acesso;
create policy portal_acesso_own on public.portal_acesso
  for all
  using (personal_id = auth.uid())
  with check (personal_id = auth.uid());
