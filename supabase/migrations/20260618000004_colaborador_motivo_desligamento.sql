-- ============================================================================
-- Sinaltran · RH — motivo do desligamento
--   Texto livre preenchido quando o colaborador é desligado (data informada).
-- ============================================================================
alter table public.colaboradores add column if not exists motivo_desligamento text;
