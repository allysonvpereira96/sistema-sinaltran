-- ============================================================================
-- Sinaltran · Campos fiscais do serviço (espelham o cadastro do Omie)
--   A planilha SINALTRAN_Servicos.xlsx (export do Omie) traz, por serviço:
--   INSS (alíquota + retenção) e a "Tributação do Serviço" — necessários para
--   preencher a planilha de importação de Ordem de Serviço do Omie sem deixar
--   campos vazios. ISS, LC116 e código do município já existiam.
-- ============================================================================

alter table public.servicos
  add column if not exists aliquota_inss numeric(5, 2) not null default 0;
alter table public.servicos
  add column if not exists retem_inss boolean not null default false;
alter table public.servicos
  add column if not exists tributacao text;
alter table public.servicos
  add column if not exists codigo_nbs text;
