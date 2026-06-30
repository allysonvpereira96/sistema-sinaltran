-- ============================================================================
-- Sinaltran · Orçamento: emitir como NFS única (material entra como serviço)
--   Algumas obras são faturadas com uma única NFS-e (sem NF-e de material) —
--   tudo sai como serviço. Esse flag muda o export pro Omie: em vez de O.S. +
--   Pedidos de Venda, gera uma única Ordem de Serviço com todos os itens.
-- ============================================================================

alter table public.orcamentos
  add column if not exists emite_nota_unica_servico boolean not null default false;
