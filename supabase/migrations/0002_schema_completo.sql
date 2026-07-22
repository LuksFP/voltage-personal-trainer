-- ============================================================
-- Personal Trainer (Voltage) — schema completo (Fase 0)
-- Aditivo sobre 0001_init.sql. Estratégia:
--   • Núcleo (personal ↔ aluno ↔ treino ↔ execução) = relacional, p/ RLS e queries.
--   • Estruturas profundas (séries executadas, feedback, hábitos, nutrição...) = JSONB,
--     espelhando os tipos do app sem normalização excessiva.
--   • Acesso do aluno = HÍBRIDO: por enquanto um token secreto no link (portal_token);
--     alunos.user_id fica pronto p/ plugar login do aluno numa fase futura.
--   • Portal grava via route handlers do Next.js usando a service role (valida o token
--     e escreve em nome do aluno). A RLS abaixo protege o cliente do PERSONAL (auth.uid()).
-- ============================================================

-- ---------- Extensões nas tabelas do 0001 ----------

alter table public.alunos
  add column if not exists modalidade     text,
  add column if not exists peso_meta       numeric,
  add column if not exists mensalidade      numeric,
  add column if not exists dia_vencimento   int check (dia_vencimento between 1 and 28),
  -- Acesso por link secreto (Fase 2). Único e não adivinhável.
  add column if not exists portal_token     text unique default encode(gen_random_bytes(16), 'hex'),
  -- Futuro login do aluno (Fase futura): 1 aluno ↔ 1 auth.users, opcional.
  add column if not exists user_id          uuid references auth.users (id) on delete set null,
  add column if not exists atualizado_em    timestamptz not null default now();

create index if not exists alunos_portal_token_idx on public.alunos (portal_token);
create index if not exists alunos_user_id_idx on public.alunos (user_id);

alter table public.treino_divisoes
  -- Feature "treino do dia": dias da semana (0=dom..6=sáb) em que esta divisão é a de hoje.
  add column if not exists dias_semana int[] not null default '{}',
  -- Supersets/circuitos: estrutura de blocos preservada como JSONB (referencia ids de exercícios).
  add column if not exists blocos jsonb not null default '[]';

alter table public.exercicios
  add column if not exists biblioteca_id uuid,
  add column if not exists ordem int not null default 0;

-- ---------- Biblioteca de exercícios (do personal) ----------
create table if not exists public.exercicios_biblioteca (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references public.personais (id) on delete cascade,
  nome text not null,
  grupo text,
  equipamento text,
  instrucoes text,
  video_url text,
  criado_em timestamptz not null default now()
);
create index if not exists ex_biblioteca_personal_idx on public.exercicios_biblioteca (personal_id);

-- FK tardia de exercicios.biblioteca_id (a tabela alvo só existe agora).
do $$ begin
  alter table public.exercicios
    add constraint exercicios_biblioteca_fk
    foreign key (biblioteca_id) references public.exercicios_biblioteca (id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------- Modelos e programas ----------
create table if not exists public.templates_treino (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references public.personais (id) on delete cascade,
  nome text not null,
  descricao text,
  divisoes jsonb not null default '[]', -- estrutura completa clonável
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists templates_personal_idx on public.templates_treino (personal_id);

create table if not exists public.programas_treino (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  nome text not null,
  objetivo text,
  data_inicio date,
  data_fim date,
  status text not null default 'rascunho'
    check (status in ('rascunho','ativo','concluido','cancelado')),
  fases jsonb not null default '[]',
  renovado_de_programa_id uuid references public.programas_treino (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists programas_aluno_idx on public.programas_treino (aluno_id);

-- ---------- Agenda / sessões ----------
create table if not exists public.sessoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  data date not null,
  hora text not null,
  duracao_min int,
  foco text,
  treino_id uuid references public.treinos (id) on delete set null,
  divisao_id uuid references public.treino_divisoes (id) on delete set null,
  pacote_id uuid,
  status text not null default 'agendada'
    check (status in ('agendada','realizada','faltou','cancelada')),
  feedback jsonb,                    -- FeedbackTreino
  registro_operacao_id text,         -- idempotência da conclusão pelo portal
  recorrencia_id text,
  recorrencia_ordem int,
  cancelada_em timestamptz,
  motivo_cancelamento text,
  origem_reposicao_id uuid,
  reposicao_sessao_id uuid,
  criado_em timestamptz not null default now()
);
create index if not exists sessoes_aluno_idx on public.sessoes (aluno_id);
create index if not exists sessoes_data_idx on public.sessoes (aluno_id, data);
create unique index if not exists sessoes_operacao_uq
  on public.sessoes (registro_operacao_id) where registro_operacao_id is not null;

-- ---------- Histórico de execução (gravado pelo portal) ----------
create table if not exists public.historico_exercicios (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  sessao_id uuid references public.sessoes (id) on delete set null,
  treino_id uuid,
  treino_nome text,
  divisao_id uuid,
  divisao_nome text,
  exercicio_id uuid,
  biblioteca_id uuid,
  nome text not null,
  data date not null,
  formato text not null default 'por-serie'
    check (formato in ('por-serie','resumo-legado')),
  series_executadas jsonb,  -- SerieExecutada[] (reps/carga/rpe? opcional/tipo...)
  resumo_legado jsonb,      -- registros antigos
  criado_em timestamptz not null default now()
);
create index if not exists hist_aluno_idx on public.historico_exercicios (aluno_id);
create index if not exists hist_aluno_data_idx on public.historico_exercicios (aluno_id, data);

-- ---------- Vídeos de execução (arquivo no Storage) ----------
create table if not exists public.videos_execucao (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  treino_id uuid,
  divisao_id uuid,
  exercicio_id uuid,
  exercicio_nome_snapshot text not null,
  storage_path text not null,        -- caminho no bucket 'videos-execucao'
  arquivo_nome text,
  mime_type text,
  tamanho_bytes bigint,
  duracao_segundos numeric,
  observacoes_aluno text,
  status text not null default 'pendente' check (status in ('pendente','revisado')),
  comentario_personal text,
  criado_em timestamptz not null default now(),
  revisado_em timestamptz
);
create index if not exists videos_aluno_idx on public.videos_execucao (aluno_id);
create index if not exists videos_status_idx on public.videos_execucao (aluno_id, status);

-- ---------- Solicitações de substituição de exercício ----------
create table if not exists public.solicitacoes_substituicao (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  treino_id uuid,
  divisao_id uuid,
  exercicio_id uuid,
  exercicio_nome_snapshot text not null,
  motivo text not null,
  detalhes text,
  status text not null default 'pendente'
    check (status in ('pendente','aprovada','recusada','cancelada')),
  substituto jsonb,
  resposta_personal text,
  criado_em timestamptz not null default now(),
  respondida_em timestamptz
);
create index if not exists subs_aluno_idx on public.solicitacoes_substituicao (aluno_id);

-- ---------- Financeiro: pacotes e pagamentos ----------
create table if not exists public.pacotes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  nome text not null,
  contratadas int not null,
  valor numeric,
  data_inicio date,
  data_validade date,
  criado_em timestamptz not null default now()
);
create index if not exists pacotes_aluno_idx on public.pacotes (aluno_id);

create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  competencia text not null,          -- "YYYY-MM"
  valor numeric not null,
  vencimento date not null,
  status text not null default 'pendente' check (status in ('pago','pendente')),
  pago_em date,
  metodo text,
  criado_em timestamptz not null default now()
);
create index if not exists pagamentos_aluno_idx on public.pagamentos (aluno_id);

-- ---------- Avaliações físicas (fotos no Storage) ----------
create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  data date not null,
  peso numeric,
  percentual_gordura numeric,
  cintura numeric,
  quadril numeric,
  peito numeric,
  braco numeric,
  coxa numeric,
  fotos text[] not null default '{}', -- caminhos no bucket 'avaliacao-fotos'
  observacoes text,
  criado_em timestamptz not null default now()
);
create index if not exists avaliacoes_aluno_idx on public.avaliacoes (aluno_id);

-- ---------- Metas, hábitos, check-ins, anamnese, relatórios ----------
create table if not exists public.metas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  payload jsonb not null,             -- discriminated union do app (peso/medida/treino/...)
  status text not null default 'ativa',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists metas_aluno_idx on public.metas (aluno_id);

create table if not exists public.config_habitos (
  aluno_id uuid primary key references public.alunos (id) on delete cascade,
  habitos_ativos text[] not null default '{}',
  metas jsonb not null default '{}',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.registros_habitos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  data date not null,
  valores jsonb not null default '{}',
  configuracao_snapshot jsonb not null default '{}',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (aluno_id, data)
);
create index if not exists habitos_aluno_idx on public.registros_habitos (aluno_id);

create table if not exists public.checkins_semanais (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  semana date not null,               -- segunda-feira de referência
  payload jsonb not null,             -- respostas do check-in
  criado_em timestamptz not null default now(),
  unique (aluno_id, semana)
);
create index if not exists checkins_aluno_idx on public.checkins_semanais (aluno_id);

create table if not exists public.anamneses (
  aluno_id uuid primary key references public.alunos (id) on delete cascade,
  payload jsonb not null,             -- PAR-Q + histórico
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.relatorios_semanais (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  semana date not null,
  payload jsonb not null,
  criado_em timestamptz not null default now(),
  unique (aluno_id, semana)
);
create index if not exists relatorios_aluno_idx on public.relatorios_semanais (aluno_id);

-- ---------- Nutrição ----------
create table if not exists public.alimentos_banco (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references public.personais (id) on delete cascade,
  nome text not null,
  medida_padrao jsonb,                -- porção/macros de referência
  criado_em timestamptz not null default now()
);
create index if not exists alimentos_personal_idx on public.alimentos_banco (personal_id);

create table if not exists public.planos_alimentares (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  nome text,
  status text not null default 'ativo' check (status in ('ativo','arquivado')),
  metas jsonb not null default '{}',  -- alvos de macros
  refeicoes jsonb not null default '[]',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists planos_aluno_idx on public.planos_alimentares (aluno_id);

-- ---------- Progressão ----------
create table if not exists public.sugestoes_progressao (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  historico_origem_id uuid references public.historico_exercicios (id) on delete cascade,
  treino_id uuid,
  divisao_id uuid,
  exercicio_id uuid,
  biblioteca_id uuid,
  exercicio_nome_snapshot text not null,
  carga_atual_kg numeric,
  carga_sugerida_kg numeric,
  rpe_medio numeric,                  -- pode ser nulo (RPE é opcional)
  motivo text,
  status text not null default 'pendente' check (status in ('pendente','aceita','ignorada')),
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz
);
create index if not exists sugestoes_aluno_idx on public.sugestoes_progressao (aluno_id);

-- ---------- CRM: interessados (do personal) ----------
create table if not exists public.interessados (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references public.personais (id) on delete cascade,
  nome text not null,
  telefone text,
  email text,
  objetivo text,
  origem text,
  origem_detalhe text,
  status text not null default 'novo',
  proximo_follow_up date,
  historico_contatos jsonb not null default '[]',
  aula_experimental jsonb,
  observacoes text,
  motivo_perda text,
  convertido_aluno_id uuid references public.alunos (id) on delete set null,
  convertido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists interessados_personal_idx on public.interessados (personal_id);

-- ============================================================
-- Helper de acesso do aluno por token (Fase 2)
-- Route handlers do portal chamam com a service role; a função existe para
-- centralizar a resolução token->aluno e, no futuro, sustentar RLS por claim.
-- ============================================================
create or replace function public.aluno_id_por_token(p_token text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.alunos where portal_token = p_token limit 1;
$$;
revoke all on function public.aluno_id_por_token(text) from public, anon, authenticated;

-- ============================================================
-- Row Level Security — "o personal é dono de tudo"
-- (o portal escreve com service role, que ignora RLS)
-- ============================================================

-- helper: aluno pertence ao personal logado?
create or replace function public.aluno_e_meu(p_aluno_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.alunos a
    where a.id = p_aluno_id and a.personal_id = auth.uid()
  );
$$;

do $$
declare
  t text;
  -- tabelas escopadas por aluno_id
  aluno_tabelas text[] := array[
    'programas_treino','sessoes','historico_exercicios','videos_execucao',
    'solicitacoes_substituicao','pacotes','pagamentos','avaliacoes','metas',
    'config_habitos','registros_habitos','checkins_semanais','anamneses',
    'relatorios_semanais','planos_alimentares','sugestoes_progressao'
  ];
  -- tabelas escopadas direto por personal_id
  personal_tabelas text[] := array[
    'exercicios_biblioteca','templates_treino','alimentos_banco','interessados'
  ];
begin
  foreach t in array aluno_tabelas loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($f$
      create policy %I on public.%I for all
      using (public.aluno_e_meu(aluno_id))
      with check (public.aluno_e_meu(aluno_id));
    $f$, t || '_all_own', t);
  end loop;

  foreach t in array personal_tabelas loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($f$
      create policy %I on public.%I for all
      using (personal_id = auth.uid())
      with check (personal_id = auth.uid());
    $f$, t || '_all_own', t);
  end loop;
end $$;

-- ============================================================
-- Storage: buckets privados p/ vídeo e fotos de progresso
-- Convenção de caminho: <aluno_id>/<arquivo>
-- Uploads do portal são feitos pela service role (após validar o token);
-- o personal lê os arquivos dos seus alunos.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('videos-execucao', 'videos-execucao', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avaliacao-fotos', 'avaliacao-fotos', false)
on conflict (id) do nothing;

-- personal lê/gera URL assinada dos arquivos dos SEUS alunos (1º segmento do path = aluno_id)
create policy "storage_videos_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'videos-execucao'
    and public.aluno_e_meu( (split_part(name, '/', 1))::uuid )
  );

create policy "storage_fotos_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avaliacao-fotos'
    and public.aluno_e_meu( (split_part(name, '/', 1))::uuid )
  );

-- personal pode remover arquivos dos seus alunos (limpeza)
create policy "storage_videos_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'videos-execucao'
    and public.aluno_e_meu( (split_part(name, '/', 1))::uuid )
  );

create policy "storage_fotos_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avaliacao-fotos'
    and public.aluno_e_meu( (split_part(name, '/', 1))::uuid )
  );
