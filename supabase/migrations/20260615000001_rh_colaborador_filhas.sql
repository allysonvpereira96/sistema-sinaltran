-- ============================================================================
-- Sinaltran · RH — tabelas-filhas de colaboradores + storage de documentos
-- Documentos, dependentes, férias e histórico vinculados a public.colaboradores.
-- ============================================================================

-- ── Documentos ───────────────────────────────────────────────────────────────
create table if not exists public.colaborador_documentos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  tipo text not null default 'outros',
  descricao text,
  arquivo_url text not null,
  dias_atestado integer,
  uploaded_by uuid references auth.users(id),
  data_upload timestamptz not null default now()
);
create index if not exists colaborador_documentos_colaborador_idx
  on public.colaborador_documentos (colaborador_id);
create index if not exists colaborador_documentos_tipo_idx
  on public.colaborador_documentos (tipo);

-- ── Dependentes ──────────────────────────────────────────────────────────────
create table if not exists public.colaborador_dependentes (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  nome text not null,
  parentesco text,
  data_nascimento date,
  cpf text,
  created_at timestamptz not null default now()
);
create index if not exists colaborador_dependentes_colaborador_idx
  on public.colaborador_dependentes (colaborador_id);

-- ── Férias ───────────────────────────────────────────────────────────────────
create table if not exists public.colaborador_ferias (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  periodo_aquisitivo_inicio date,
  periodo_aquisitivo_fim date,
  data_inicio date not null,
  data_fim date not null,
  dias integer not null default 30,
  status text not null default 'agendada'
    check (status in ('agendada', 'em_gozo', 'concluida')),
  created_at timestamptz not null default now()
);
create index if not exists colaborador_ferias_colaborador_idx
  on public.colaborador_ferias (colaborador_id);

-- ── Histórico ────────────────────────────────────────────────────────────────
create table if not exists public.colaborador_historico (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  tipo text not null default 'alteracao_salarial'
    check (tipo in ('admissao', 'promocao', 'alteracao_salarial', 'transferencia', 'afastamento', 'desligamento')),
  descricao text not null,
  data date not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index if not exists colaborador_historico_colaborador_idx
  on public.colaborador_historico (colaborador_id);

-- ── RLS (padrão: autenticado vê/gerencia; admin deleta documentos) ───────────
alter table public.colaborador_documentos enable row level security;
alter table public.colaborador_dependentes enable row level security;
alter table public.colaborador_ferias enable row level security;
alter table public.colaborador_historico enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'colaborador_documentos','colaborador_dependentes','colaborador_ferias','colaborador_historico'
  ] loop
    execute format('drop policy if exists "%s: autenticado vê" on public.%I', t, t);
    execute format('drop policy if exists "%s: autenticado gerencia" on public.%I', t, t);
    execute format(
      'create policy "%s: autenticado vê" on public.%I for select to authenticated using (true)', t, t);
    execute format(
      'create policy "%s: autenticado gerencia" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;

-- ── Storage: bucket privado de documentos do colaborador ─────────────────────
insert into storage.buckets (id, name, public)
values ('colaborador-documentos', 'colaborador-documentos', false)
on conflict (id) do nothing;

drop policy if exists "colaborador-docs: autenticado lê" on storage.objects;
drop policy if exists "colaborador-docs: autenticado envia" on storage.objects;
drop policy if exists "colaborador-docs: autenticado atualiza" on storage.objects;
drop policy if exists "colaborador-docs: autenticado remove" on storage.objects;

create policy "colaborador-docs: autenticado lê"
  on storage.objects for select to authenticated
  using (bucket_id = 'colaborador-documentos');
create policy "colaborador-docs: autenticado envia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'colaborador-documentos');
create policy "colaborador-docs: autenticado atualiza"
  on storage.objects for update to authenticated
  using (bucket_id = 'colaborador-documentos');
create policy "colaborador-docs: autenticado remove"
  on storage.objects for delete to authenticated
  using (bucket_id = 'colaborador-documentos');
