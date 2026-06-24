-- ============================================================================
-- Sinaltran · Módulo de Compras (Procure-to-Pay) + Almoxarifado de Materiais
--   Fluxo do pedido: Solicitação → Triagem → Cotação → Aprovação → Compra →
--   Entrega → Retirada. Triagem consulta o saldo do almoxarifado; Entrega dá
--   entrada no estoque; Retirada gera saída para a obra (custo realizado).
--
--   Saldo de estoque é derivado por trigger (fonte única da verdade), no mesmo
--   modelo do almoxarifado de EPI (20260618000011_epi_almoxarifado.sql).
-- ============================================================================

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 1) ALMOXARIFADO DE MATERIAIS                                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Saldo (1:1 com materiais; mínimo continua em materiais.estoque_minimo) ────
create table if not exists public.materiais_estoque (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null unique references public.materiais(id) on delete cascade,
  quantidade_atual numeric(14, 3) not null default 0,
  updated_at timestamptz not null default now()
);

-- ── Ledger de movimentações ──────────────────────────────────────────────────
create table if not exists public.materiais_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materiais(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade numeric(14, 3) not null check (quantidade > 0),
  valor_unitario numeric(12, 2) not null default 0,
  obra_id uuid references public.obras(id) on delete set null,   -- saída p/ obra
  pedido_id uuid,                                                 -- origem (compras_pedidos)
  motivo text,
  numero_nf text,
  usuario_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists materiais_mov_material_idx on public.materiais_movimentacoes (material_id);
create index if not exists materiais_mov_obra_idx on public.materiais_movimentacoes (obra_id);
create index if not exists materiais_mov_pedido_idx on public.materiais_movimentacoes (pedido_id);
create index if not exists materiais_mov_data_idx on public.materiais_movimentacoes (created_at);

-- ── Saldo derivado pelo trigger ──────────────────────────────────────────────
create or replace function public.materiais_aplica_movimentacao()
returns trigger language plpgsql as $$
begin
  insert into public.materiais_estoque (material_id, quantidade_atual)
  values (NEW.material_id,
          case when NEW.tipo = 'entrada' then NEW.quantidade else -NEW.quantidade end)
  on conflict (material_id) do update
    set quantidade_atual = public.materiais_estoque.quantidade_atual
          + (case when NEW.tipo = 'entrada' then NEW.quantidade else -NEW.quantidade end),
        updated_at = now();
  return NEW;
end $$;
create trigger trg_materiais_mov_aplica
  after insert on public.materiais_movimentacoes
  for each row execute function public.materiais_aplica_movimentacao();

-- ── Seed: cria linha de saldo (0) para materiais já cadastrados ───────────────
insert into public.materiais_estoque (material_id, quantidade_atual)
select m.id, 0 from public.materiais m
on conflict (material_id) do nothing;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 2) COMPRAS (pedido / fluxo P2P)                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Pedido (header) ──────────────────────────────────────────────────────────
create table if not exists public.compras_pedidos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,                          -- sequencial gerado na action
  empresa_id uuid references public.empresas(id) on delete set null,
  obra_id uuid references public.obras(id) on delete set null,
  solicitante_id uuid references public.colaboradores(id) on delete set null,
  prioridade text not null default 'media'
    check (prioridade in ('baixa', 'media', 'alta', 'urgente')),
  status text not null default 'solicitacao'
    check (status in ('solicitacao', 'triagem', 'cotacao', 'aprovacao',
                      'compra', 'entrega', 'retirada', 'cancelado')),
  titulo text not null,
  justificativa text,
  data_solicitacao date not null default current_date,
  data_limite date,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,  -- selecionado
  valor_estimado numeric(15, 2) not null default 0,
  valor_final numeric(15, 2) not null default 0,
  numero_nf text,
  data_entrega date,
  data_retirada date,
  observacoes text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists compras_pedidos_obra_idx on public.compras_pedidos (obra_id);
create index if not exists compras_pedidos_status_idx on public.compras_pedidos (status);
create index if not exists compras_pedidos_fornecedor_idx on public.compras_pedidos (fornecedor_id);

-- ── Itens do pedido (material de catálogo OU texto livre) ─────────────────────
create table if not exists public.compras_pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.compras_pedidos(id) on delete cascade,
  material_id uuid references public.materiais(id) on delete set null,  -- null = texto livre
  descricao text not null,                              -- snapshot / texto livre
  unidade text not null default 'UN',
  quantidade numeric(14, 3) not null default 1,
  valor_estimado_unit numeric(12, 2) not null default 0,
  qtd_estoque numeric(14, 3) not null default 0,        -- triagem: atender do estoque
  qtd_comprar numeric(14, 3) not null default 0,        -- triagem: comprar
  observacoes text,
  created_at timestamptz not null default now()
);
create index if not exists compras_itens_pedido_idx on public.compras_pedido_itens (pedido_id);
create index if not exists compras_itens_material_idx on public.compras_pedido_itens (material_id);

-- ── Cotações (RFQ por fornecedor) ────────────────────────────────────────────
create table if not exists public.compras_cotacoes (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.compras_pedidos(id) on delete cascade,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  fornecedor_nome text,                                 -- snapshot (fornecedor avulso)
  valor_total numeric(15, 2) not null default 0,
  prazo_entrega_dias integer,
  condicoes_pagamento text,
  observacoes text,
  selecionada boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists compras_cotacoes_pedido_idx on public.compras_cotacoes (pedido_id);

-- ── Histórico / linha do tempo (auditoria das transições) ─────────────────────
create table if not exists public.compras_historico (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.compras_pedidos(id) on delete cascade,
  de_status text,
  para_status text not null,
  comentario text,
  usuario_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists compras_historico_pedido_idx on public.compras_historico (pedido_id);

-- FK tardia: movimentação de estoque pode apontar para o pedido de origem
alter table public.materiais_movimentacoes
  drop constraint if exists materiais_mov_pedido_fk;
alter table public.materiais_movimentacoes
  add constraint materiais_mov_pedido_fk
  foreign key (pedido_id) references public.compras_pedidos(id) on delete set null;

create trigger update_compras_pedidos_updated_at
  before update on public.compras_pedidos
  for each row execute function public.update_updated_at_column();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 3) RLS (autenticado vê / gerencia) — mesmo padrão do EPI                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
do $$
declare t text;
begin
  foreach t in array array[
    'materiais_estoque','materiais_movimentacoes',
    'compras_pedidos','compras_pedido_itens','compras_cotacoes','compras_historico'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s: autenticado vê" on public.%I', t, t);
    execute format('drop policy if exists "%s: autenticado gerencia" on public.%I', t, t);
    execute format('create policy "%s: autenticado vê" on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy "%s: autenticado gerencia" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;
