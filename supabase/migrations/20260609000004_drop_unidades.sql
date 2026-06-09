-- ============================================================================
-- Sinaltran · Drop unidades
--   Sinaltran opera como empresa única, atendendo clientes diretamente.
--   Local de execução fica no orçamento (e é copiado para a obra).
-- ============================================================================

-- Drop FKs e colunas que apontam para unidades
alter table public.obras drop column if exists unidade_id;
alter table public.orcamentos drop column if exists unidade_id;
alter table public.colaboradores drop column if exists unidade_id;

-- Adicionar local da obra no orçamento
alter table public.orcamentos add column if not exists endereco text;
alter table public.orcamentos add column if not exists cidade text;
alter table public.orcamentos add column if not exists estado text;

-- Dropar tabela unidades
drop table if exists public.unidades;
