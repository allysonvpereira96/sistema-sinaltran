-- ============================================================================
-- Sinaltran · RH — extras de colaboradores: comentários, ocorrências,
-- avaliações e colunas de termos.
-- ============================================================================

-- ── Comentários internos ─────────────────────────────────────────────────────
create table if not exists public.colaborador_comentarios (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  comentario text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists colaborador_comentarios_colaborador_idx
  on public.colaborador_comentarios (colaborador_id);

-- ── Ocorrências (caderno virtual) ────────────────────────────────────────────
create table if not exists public.colaborador_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  tipo text not null default 'observacao'
    check (tipo in ('falta','atraso','atestado','advertencia','suspensao','elogio','observacao','outro')),
  descricao text not null,
  data date not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists colaborador_ocorrencias_colaborador_idx
  on public.colaborador_ocorrencias (colaborador_id);

-- ── Avaliações de desempenho ─────────────────────────────────────────────────
create table if not exists public.colaborador_avaliacoes (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  data date not null,
  periodo text,
  nota numeric(4,1) check (nota >= 0 and nota <= 10),
  avaliador text,
  pontos_fortes text,
  pontos_melhorar text,
  observacoes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists colaborador_avaliacoes_colaborador_idx
  on public.colaborador_avaliacoes (colaborador_id);

-- ── Termos (colunas em colaboradores) ────────────────────────────────────────
alter table public.colaboradores add column if not exists termo_uso_imagem boolean not null default false;
alter table public.colaboradores add column if not exists termo_uso_imagem_data date;
alter table public.colaboradores add column if not exists manual_conduta boolean not null default false;
alter table public.colaboradores add column if not exists manual_conduta_data date;

-- ── RLS (padrão: autenticado vê/gerencia) ────────────────────────────────────
alter table public.colaborador_comentarios enable row level security;
alter table public.colaborador_ocorrencias enable row level security;
alter table public.colaborador_avaliacoes enable row level security;

do $$
declare t text;
begin
  foreach t in array array['colaborador_comentarios','colaborador_ocorrencias','colaborador_avaliacoes'] loop
    execute format('drop policy if exists "%s: autenticado vê" on public.%I', t, t);
    execute format('drop policy if exists "%s: autenticado gerencia" on public.%I', t, t);
    execute format('create policy "%s: autenticado vê" on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy "%s: autenticado gerencia" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;
