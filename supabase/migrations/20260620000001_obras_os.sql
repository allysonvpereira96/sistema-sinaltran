-- ============================================================================
-- Sinaltran · Obras → Ordens de Serviço (O.S diária — "Equipe Trecho")
--   O cadastro de Equipamentos (frota) já existe em 20260609000002_cadastros.sql
--   e alimenta o select de veículo da O.S (tipo = 'veiculo').
-- ============================================================================

-- ============================================================================
-- ORDENS DE SERVIÇO (O.S diária — preenchida pelo DP + supervisor)
-- ============================================================================
create type public.os_status as enum (
  'aberta',
  'em_andamento',
  'concluida',
  'cancelada'
);

create table public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  empresa_id uuid references public.empresas(id) on delete set null,
  obra_id uuid references public.obras(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  pedido_omie text,
  data date not null,
  hora_saida time,
  hora_chegada time,
  cidade text,
  veiculo_id uuid references public.equipamentos(id) on delete set null,
  encarregado_id uuid references public.colaboradores(id) on delete set null,
  motorista_id uuid references public.colaboradores(id) on delete set null,
  km_inicial numeric(10, 1),
  km_final numeric(10, 1),
  diaristas text,
  status os_status not null default 'aberta',
  observacoes text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ordens_servico_obra_idx on public.ordens_servico (obra_id);
create index ordens_servico_data_idx on public.ordens_servico (data);
create index ordens_servico_status_idx on public.ordens_servico (status);

alter table public.ordens_servico enable row level security;

create policy "OrdensServico: autenticado vê"
  on public.ordens_servico for select to authenticated using (true);

create policy "OrdensServico: autenticado gerencia"
  on public.ordens_servico for all to authenticated
  using (auth.uid() = user_id or public.is_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create trigger update_ordens_servico_updated_at
  before update on public.ordens_servico
  for each row execute function public.update_updated_at_column();

-- ============================================================================
-- OS_EQUIPE (Equipe CLT alocada na O.S — N colaboradores por O.S)
-- ============================================================================
create table public.os_equipe (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  unique (os_id, colaborador_id)
);

create index os_equipe_os_idx on public.os_equipe (os_id);

alter table public.os_equipe enable row level security;

create policy "OsEquipe: autenticado vê"
  on public.os_equipe for select to authenticated using (true);

create policy "OsEquipe: autenticado gerencia"
  on public.os_equipe for all to authenticated
  using (true) with check (true);
