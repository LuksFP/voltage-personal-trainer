-- ============================================================
-- Fase 1 — o dado do personal sai do navegador
-- ============================================================
-- O app carrega tudo de uma vez e grava o objeto inteiro num ponto só, então
-- espelhar isso em JSONB dá multi-dispositivo imediato sem reescrever as 150+
-- operações da store. As tabelas relacionais seguem no banco para quando o
-- portal do aluno e os relatórios no servidor justificarem a migração fina.
create table if not exists public.app_estado (
  personal_id    uuid primary key references public.personais (id) on delete cascade,
  dados          jsonb not null,
  schema_version integer not null default 0,
  atualizado_em  timestamptz not null default now()
);

alter table public.app_estado enable row level security;

drop policy if exists app_estado_select_own on public.app_estado;
create policy app_estado_select_own on public.app_estado
  for select using (personal_id = auth.uid());

drop policy if exists app_estado_insert_own on public.app_estado;
create policy app_estado_insert_own on public.app_estado
  for insert with check (personal_id = auth.uid());

drop policy if exists app_estado_update_own on public.app_estado;
create policy app_estado_update_own on public.app_estado
  for update using (personal_id = auth.uid()) with check (personal_id = auth.uid());

drop policy if exists app_estado_delete_own on public.app_estado;
create policy app_estado_delete_own on public.app_estado
  for delete using (personal_id = auth.uid());

-- Toda gravação marca a hora; é o que permite detectar que outro aparelho
-- escreveu depois de a aba atual ter carregado.
create or replace function public.tocar_app_estado()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists app_estado_touch on public.app_estado;
create trigger app_estado_touch
  before update on public.app_estado
  for each row execute function public.tocar_app_estado();
