-- ============================================================================
-- Sinaltran · Medições: etapa de faturamento do recebível
--   Entre "aprovada" e "recebida" entra o faturamento: emissão da NFS-e (ou
--   acerto de transferência), que gera o título com VENCIMENTO real. A situação
--   "a receber" / "vencida" / "recebida" é derivada das datas (sem novo enum).
--   valor_recebido permite baixa parcial (retenções, glosas, pagamento menor).
-- ============================================================================

alter table public.medicoes
  add column if not exists data_faturamento date,
  add column if not exists numero_nf text,
  add column if not exists data_vencimento date,
  add column if not exists forma_recebimento text,
  add column if not exists valor_recebido numeric(15, 2);

-- Vencimento real do título (carteira de recebíveis / aging / fluxo de caixa).
create index if not exists medicoes_vencimento_idx
  on public.medicoes (data_vencimento);
