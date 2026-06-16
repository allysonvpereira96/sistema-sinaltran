-- ============================================================================
-- Sinaltran · Medições como contas a receber
--   A medição já existe (003). Aqui adicionamos o fluxo de recebível:
--   envio ao cliente, aprovação, previsão de recebimento e baixa (recebido).
--   Uma medição aprovada e ainda sem data_recebimento é uma conta "a receber".
-- ============================================================================

alter table public.medicoes
  add column if not exists data_envio date,
  add column if not exists data_aprovacao date,
  add column if not exists data_previsao_recebimento date,
  add column if not exists data_recebimento date;

create index if not exists medicoes_previsao_idx
  on public.medicoes (data_previsao_recebimento);
