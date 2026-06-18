-- ============================================================================
-- Sinaltran · RH — alocação do colaborador por CENTRO DE CUSTO
--   Substitui o vínculo por obra (obra_id) por centro de custo (centro_custo_id).
--   A tabela public.centros_custo já existe (migration 0002_cadastros).
-- ============================================================================

-- Novo vínculo: colaborador → centro de custo
alter table public.colaboradores
  add column if not exists centro_custo_id uuid
  references public.centros_custo(id) on delete set null;

create index if not exists colaboradores_centro_custo_idx
  on public.colaboradores (centro_custo_id);

-- Remove o vínculo antigo por obra (o índice colaboradores_obra_idx some junto).
alter table public.colaboradores drop column if exists obra_id;
