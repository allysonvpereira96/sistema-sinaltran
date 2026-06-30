-- ============================================================================
-- Sinaltran · RH — Benefícios (alimentação/VR, cesta básica, combustível)
--   Lançamento mensal por empresa e colaborador, com base para o recibo.
--   Faltas/atestados são sugeridos a partir do Caderno (colaborador_ocorrencias).
-- ============================================================================
create table if not exists public.beneficio_lancamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete set null,
  tipo text not null check (tipo in ('alimentacao', 'cesta', 'combustivel')),
  competencia date not null,                 -- 1º dia do mês de referência
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  recebe boolean not null default true,
  observacao text,
  valor_total numeric(12, 2) not null default 0,
  faltas integer not null default 0,
  atestados integer not null default 0,
  detalhes jsonb,                            -- campos específicos por tipo
  -- recibo / assinatura (reusa o padrão do EPI; bucket assinaturas-epi)
  assinatura_token uuid,
  assinado boolean not null default false,
  data_assinatura timestamptz,
  assinatura_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, tipo, competencia, colaborador_id)
);

create index if not exists beneficio_lanc_comp_idx on public.beneficio_lancamentos (tipo, competencia);
create index if not exists beneficio_lanc_colab_idx on public.beneficio_lancamentos (colaborador_id);
create index if not exists beneficio_lanc_token_idx on public.beneficio_lancamentos (assinatura_token);

create trigger update_beneficio_lancamentos_updated_at
  before update on public.beneficio_lancamentos
  for each row execute function public.update_updated_at_column();

alter table public.beneficio_lancamentos enable row level security;
drop policy if exists "Beneficios: autenticado vê" on public.beneficio_lancamentos;
drop policy if exists "Beneficios: autenticado gerencia" on public.beneficio_lancamentos;
create policy "Beneficios: autenticado vê"
  on public.beneficio_lancamentos for select to authenticated using (true);
create policy "Beneficios: autenticado gerencia"
  on public.beneficio_lancamentos for all to authenticated using (true) with check (true);

-- ── Contagem de faltas/atestados do mês (do caderno) por colaborador ─────────
create or replace function public.contar_faltas_atestados(p_inicio date, p_fim date)
returns table (colaborador_id uuid, faltas integer, atestados integer)
language sql
stable
as $$
  select o.colaborador_id,
         count(*) filter (where o.tipo = 'falta')::int as faltas,
         count(*) filter (where o.tipo = 'atestado')::int as atestados
  from public.colaborador_ocorrencias o
  where o.data >= p_inicio and o.data <= p_fim
  group by o.colaborador_id;
$$;
