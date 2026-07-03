-- ============================================================
-- Personal Trainer App — schema inicial
-- ============================================================

-- Perfil do personal (1:1 com auth.users)
create table if not exists public.personais (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text,
  created_at timestamptz not null default now()
);

-- Alunos de cada personal
create table if not exists public.alunos (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references public.personais (id) on delete cascade,
  nome text not null,
  telefone text,
  email text,
  objetivo text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists alunos_personal_id_idx on public.alunos (personal_id);

-- Planilha de treino de um aluno
create table if not exists public.treinos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists treinos_aluno_id_idx on public.treinos (aluno_id);

-- Divisões da planilha (Treino A, B, C...)
create table if not exists public.treino_divisoes (
  id uuid primary key default gen_random_uuid(),
  treino_id uuid not null references public.treinos (id) on delete cascade,
  nome text not null,
  ordem int not null default 0
);
create index if not exists treino_divisoes_treino_id_idx on public.treino_divisoes (treino_id);

-- Exercícios de cada divisão
create table if not exists public.exercicios (
  id uuid primary key default gen_random_uuid(),
  divisao_id uuid not null references public.treino_divisoes (id) on delete cascade,
  nome text not null,
  series text,
  repeticoes text,
  carga text,
  descanso text,
  observacoes text,
  ordem int not null default 0
);
create index if not exists exercicios_divisao_id_idx on public.exercicios (divisao_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.personais enable row level security;
alter table public.alunos enable row level security;
alter table public.treinos enable row level security;
alter table public.treino_divisoes enable row level security;
alter table public.exercicios enable row level security;

-- personais: o personal só enxerga/edita o próprio perfil
create policy "personais_select_own" on public.personais
  for select using (id = auth.uid());
create policy "personais_insert_own" on public.personais
  for insert with check (id = auth.uid());
create policy "personais_update_own" on public.personais
  for update using (id = auth.uid());

-- alunos: pertencem ao personal logado
create policy "alunos_all_own" on public.alunos
  for all using (personal_id = auth.uid())
  with check (personal_id = auth.uid());

-- treinos: acessíveis se o aluno for do personal logado
create policy "treinos_all_own" on public.treinos
  for all using (
    exists (
      select 1 from public.alunos a
      where a.id = treinos.aluno_id and a.personal_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.alunos a
      where a.id = treinos.aluno_id and a.personal_id = auth.uid()
    )
  );

-- treino_divisoes: acessíveis via treino -> aluno -> personal
create policy "divisoes_all_own" on public.treino_divisoes
  for all using (
    exists (
      select 1 from public.treinos t
      join public.alunos a on a.id = t.aluno_id
      where t.id = treino_divisoes.treino_id and a.personal_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.treinos t
      join public.alunos a on a.id = t.aluno_id
      where t.id = treino_divisoes.treino_id and a.personal_id = auth.uid()
    )
  );

-- exercicios: acessíveis via divisao -> treino -> aluno -> personal
create policy "exercicios_all_own" on public.exercicios
  for all using (
    exists (
      select 1 from public.treino_divisoes d
      join public.treinos t on t.id = d.treino_id
      join public.alunos a on a.id = t.aluno_id
      where d.id = exercicios.divisao_id and a.personal_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.treino_divisoes d
      join public.treinos t on t.id = d.treino_id
      join public.alunos a on a.id = t.aluno_id
      where d.id = exercicios.divisao_id and a.personal_id = auth.uid()
    )
  );
