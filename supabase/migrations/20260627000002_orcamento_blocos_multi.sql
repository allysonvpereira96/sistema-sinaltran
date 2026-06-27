-- ============================================================================
-- Sinaltran · Permite mais de um bloco do mesmo tipo por orçamento
--   Há obras com 2 documentos do mesmo tipo no Omie (ex: AVIVA LEGANO AURA tem
--   2 orçamentos Sinalshop — 4052 e 4040). A restrição unique(orcamento_id,tipo)
--   impedia isso. Troca por unicidade do DOCUMENTO (não do tipo).
-- ============================================================================

alter table public.orcamento_blocos
  drop constraint if exists orcamento_blocos_orcamento_id_tipo_key;

-- Evita inserir o MESMO documento Omie duas vezes (numero nulo = bloco do
-- sistema, sem doc → não entra no índice, múltiplos permitidos).
create unique index if not exists orcamento_blocos_doc_uidx
  on public.orcamento_blocos (orcamento_id, omie_doc_tipo, omie_numero)
  where omie_numero is not null;

-- Alguns Pedidos de Venda têm Frete e Desconto (Subtotal é BRUTO; o "Valor
-- Total" de cada item é LÍQUIDO, já com desconto). Guardar para re-exportar.
alter table public.orcamento_blocos
  add column if not exists valor_frete numeric(15, 2) not null default 0;
alter table public.orcamento_blocos
  add column if not exists valor_desconto numeric(15, 2) not null default 0;

alter table public.orcamento_itens
  add column if not exists valor_desconto numeric(15, 2) not null default 0;
