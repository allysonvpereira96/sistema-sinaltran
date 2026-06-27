-- ============================================================================
-- Sinaltran · Orçamento unificado em blocos fiscais (espelha o Omie)
--   Um orçamento (= 1 obra/cliente) é fechado em até 3 blocos por causa da
--   tributação, cada um virando um documento próprio no Omie:
--     · servicos  → Sinaltran  → Ordem de Serviço   (LC116/ISS)
--     · produtos  → Sinaltran  → Pedido de Venda     (NCM/IPI/ICMS)
--     · sinalshop → Sinalshop  → Pedido de Venda     (NCM/IPI/ICMS, outro CNPJ)
--   "Unificado mas separado": cabeçalho único + blocos + itens marcados por
--   bloco, guardando o nº do documento Omie para rastreabilidade e re-export.
-- ============================================================================

-- ── Blocos fiscais do orçamento (até 3) ──────────────────────────────────────
create table if not exists public.orcamento_blocos (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  tipo text not null check (tipo in ('servicos', 'produtos', 'sinalshop')),
  empresa_id uuid references public.empresas(id) on delete set null,
  -- Documento Omie de ORIGEM (no histórico) e/ou alvo de re-export.
  omie_doc_tipo text check (omie_doc_tipo in ('ordem_servico', 'pedido_venda', 'orcamento')),
  omie_numero text,                                   -- 1656 / 819 / 4045
  vendedor text,
  data_documento date,                                -- "incluído em"
  previsao_faturamento date,
  condicoes_pagamento text,
  valor_subtotal numeric(15, 2) not null default 0,   -- soma dos itens
  valor_ipi numeric(15, 2) not null default 0,
  valor_icms_st numeric(15, 2) not null default 0,
  valor_iss numeric(15, 2) not null default 0,
  valor_total numeric(15, 2) not null default 0,
  observacoes text,
  created_at timestamptz not null default now(),
  unique (orcamento_id, tipo)
);

create index if not exists orcamento_blocos_orcamento_idx
  on public.orcamento_blocos (orcamento_id);
create index if not exists orcamento_blocos_omie_idx
  on public.orcamento_blocos (omie_doc_tipo, omie_numero);

alter table public.orcamento_blocos enable row level security;

create policy "OrcamentoBlocos: autenticado vê"
  on public.orcamento_blocos for select to authenticated using (true);

create policy "OrcamentoBlocos: autenticado gerencia"
  on public.orcamento_blocos for all to authenticated
  using (true) with check (true);

-- ── Itens: passam a pertencer a um bloco + campos fiscais do Omie ─────────────
-- Reaproveita orcamento_itens. "Manter linhas como vêm": item de Serviços é MO
-- pura (valor_unit_mao_obra); item de Produtos/Sinalshop é material puro
-- (valor_unit_material). Itens legados (sem bloco) seguem funcionando.
alter table public.orcamento_itens
  add column if not exists bloco_id uuid references public.orcamento_blocos(id) on delete cascade;

alter table public.orcamento_itens
  add column if not exists codigo_omie text;          -- cód. do produto/serviço no Omie

alter table public.orcamento_itens
  add column if not exists ncm text;                  -- informativo (vem do PDF)

create index if not exists orcamento_itens_bloco_idx
  on public.orcamento_itens (bloco_id);

-- ── Orçamento: marca a origem (import do Omie) e o nome da obra/pasta ─────────
alter table public.orcamentos
  add column if not exists origem text not null default 'sistema'
    check (origem in ('sistema', 'omie_import'));

alter table public.orcamentos
  add column if not exists obra_nome text;            -- nome do serviço/pasta (ex: "DOBIL (ARARICÁ)")
