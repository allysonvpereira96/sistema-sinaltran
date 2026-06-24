-- ============================================================================
-- Sinaltran · Backfill de empresa nas obras
--   A lista de obras passa a ser escopada por empresa ativa. Obras existentes
--   sem empresa (criadas manualmente, sem orçamento) vão para a Sinaltran.
-- ============================================================================
update public.obras
set empresa_id = (select id from public.empresas where nome = 'Sinaltran' limit 1)
where empresa_id is null;
