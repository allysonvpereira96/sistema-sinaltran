-- ============================================================================
-- Sinaltran · RH — gratificações
--   Valor adicional que compõe a remuneração do colaborador.
-- ============================================================================
alter table public.colaboradores
  add column if not exists gratificacoes numeric(12, 2) not null default 0;
