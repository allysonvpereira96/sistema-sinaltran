-- ============================================================================
-- Sinaltran · Itens da medição (boletim por item da planilha contratada)
--   A medição deixa de ser só cabeçalho: cada linha mede um item do orçamento
--   da obra. Guardamos snapshot (descrição, unidade, qtd contratada, PU) para
--   o boletim/PDF ficar imutável mesmo se o orçamento mudar depois.
--   quantidade_medida = quanto foi executado NO PERÍODO desta medição.
--   valor_total = quantidade_medida × (valor_unit_mao_obra + valor_unit_material).
--   O saldo de um item é Qc − Σ(quantidade_medida das medições não rejeitadas).
-- ============================================================================

create table if not exists public.medicao_itens (
  id uuid primary key default gen_random_uuid(),
  medicao_id uuid not null references public.medicoes(id) on delete cascade,
  -- Origem na planilha do orçamento (null = item avulso adicionado na medição).
  orcamento_item_id uuid references public.orcamento_itens(id) on delete set null,
  ordem int not null default 0,
  tipo text not null default 'servico' check (tipo in ('material', 'servico')),
  -- Snapshot do item contratado:
  descricao text not null,
  unidade_medida text not null default 'UN',
  quantidade_contratada numeric(12, 3) not null default 0,
  valor_unit_mao_obra numeric(12, 2) not null default 0,
  valor_unit_material numeric(12, 2) not null default 0,
  -- Medição do período:
  quantidade_medida numeric(12, 3) not null default 0,
  valor_total numeric(15, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists medicao_itens_medicao_idx
  on public.medicao_itens (medicao_id);
create index if not exists medicao_itens_orcitem_idx
  on public.medicao_itens (orcamento_item_id);

alter table public.medicao_itens enable row level security;

create policy "MedicaoItens: autenticado vê"
  on public.medicao_itens for select to authenticated using (true);

create policy "MedicaoItens: autenticado gerencia"
  on public.medicao_itens for all to authenticated
  using (true) with check (true);
