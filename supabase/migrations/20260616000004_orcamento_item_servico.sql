-- ============================================================================
-- Sinaltran · Vínculo de serviço no item do orçamento
--   Permite rastrear de qual serviço do catálogo o item foi montado
--   (relatórios de serviços mais vendidos, código LC 116 / ISS para NFS-e).
--   on delete set null: apagar um serviço não apaga o item do orçamento.
-- ============================================================================

alter table public.orcamento_itens
  add column if not exists servico_id uuid references public.servicos(id) on delete set null;

create index if not exists orcamento_itens_servico_idx
  on public.orcamento_itens (servico_id);
