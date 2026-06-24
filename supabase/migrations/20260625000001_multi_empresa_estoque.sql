-- ============================================================================
-- Sinaltran · Multi-empresa: 2 estoques (Sinaltran / Sinalshop)
--   Catálogo de materiais, saldo e movimentações passam a ser por empresa.
--   Compras já tinham empresa_id (preenchido agora). Isolamento na camada de
--   app (cookie de empresa ativa), como já é no RH.
-- ============================================================================

-- ── Materiais: empresa_id (catálogo separado por empresa) ────────────────────
alter table public.materiais
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

-- Backfill: materiais existentes são todos da Sinaltran
update public.materiais
set empresa_id = (select id from public.empresas where nome = 'Sinaltran' limit 1)
where empresa_id is null;

create index if not exists materiais_empresa_idx on public.materiais (empresa_id);

-- Código deixa de ser único global e passa a ser único POR empresa
-- (permite o mesmo código em empresas diferentes).
alter table public.materiais drop constraint if exists materiais_codigo_key;
create unique index if not exists materiais_empresa_codigo_uidx
  on public.materiais (empresa_id, codigo)
  where codigo is not null;

-- ── Movimentações de estoque: empresa_id (denormalizado p/ filtro) ───────────
alter table public.materiais_movimentacoes
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

-- Backfill via material
update public.materiais_movimentacoes mm
set empresa_id = m.empresa_id
from public.materiais m
where mm.material_id = m.id and mm.empresa_id is null;

create index if not exists materiais_mov_empresa_idx
  on public.materiais_movimentacoes (empresa_id, created_at);

-- ── Compras: garante empresa nos pedidos existentes ──────────────────────────
update public.compras_pedidos
set empresa_id = (select id from public.empresas where nome = 'Sinaltran' limit 1)
where empresa_id is null;

-- Solicitante = quem está preenchendo (nome do usuário logado, snapshot).
alter table public.compras_pedidos
  add column if not exists solicitante_nome text;
