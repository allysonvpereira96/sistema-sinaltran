-- ============================================================================
-- Sinaltran · Materiais como Produtos
--   Estende a tabela materiais para acomodar o cadastro real de produtos
--   (placas, tachões, tinta, defensa…) vindos da planilha mestre:
--   família, NCM, classificação fiscal/estoque, unidade do fornecedor, peso,
--   fornecedores e — importante — PREÇO DE MÃO DE OBRA DE INSTALAÇÃO, além do
--   preço de material (valor_referencia). No orçamento, escolher o produto
--   preenche os dois (material + MO) de uma vez.
-- ============================================================================

alter table public.materiais
  add column if not exists familia text,
  add column if not exists ncm text,
  add column if not exists classificacao text,
  add column if not exists unidade_fornecedor text,
  add column if not exists peso text,
  add column if not exists fornecedores text,
  add column if not exists valor_mao_obra numeric(12, 2) not null default 0;

create index if not exists materiais_familia_idx on public.materiais (familia);
