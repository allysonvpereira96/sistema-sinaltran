-- ============================================================================
-- Sinaltran · RH — empresa (CNPJ) do colaborador
--   O sistema opera com 2 empresas: Sinaltran e Sinalshop. Colaboradores
--   passam a ter empresa_id. Os já cadastrados são todos da Sinaltran.
-- ============================================================================
alter table public.colaboradores
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

create index if not exists colaboradores_empresa_idx on public.colaboradores (empresa_id);

-- Backfill: todos os colaboradores existentes são Sinaltran
update public.colaboradores
set empresa_id = (select id from public.empresas where nome = 'Sinaltran' limit 1)
where empresa_id is null;
