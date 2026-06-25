-- ============================================================================
-- OBRAS: número de contrato (preenchido após assinatura, buscável)
-- ============================================================================
alter table public.obras
  add column if not exists numero_contrato text;

create index if not exists obras_numero_contrato_idx
  on public.obras (numero_contrato);
