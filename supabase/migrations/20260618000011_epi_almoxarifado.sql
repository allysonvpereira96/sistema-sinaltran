-- ============================================================================
-- Sinaltran · Almoxarifado de EPI (portado do LES, sem assinatura/biometria)
--   Catálogo, estoque, movimentações e entregas a colaboradores.
--   Saldo de estoque é derivado pelos triggers (fonte única da verdade).
-- ============================================================================

-- ── Catálogos auxiliares ─────────────────────────────────────────────────────
create table if not exists public.epi_categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  created_at timestamptz not null default now()
);

create table if not exists public.epi_marcas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz not null default now()
);

-- ── Item-mestre ──────────────────────────────────────────────────────────────
create table if not exists public.epi_catalogo (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  tipo text not null default 'EPI',          -- EPI | Uniforme | Ferramenta | EPC | MRO | Outros
  categoria_id uuid references public.epi_categorias(id) on delete set null,
  marca_id uuid references public.epi_marcas(id) on delete set null,
  fabricante text,
  numero_ca text,                            -- Certificado de Aprovação
  validade_ca date,
  periodicidade_troca_dias integer,          -- p/ calcular data prevista de troca
  preco_unitario numeric(12, 2) not null default 0,
  ativo boolean not null default true,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists epi_catalogo_categoria_idx on public.epi_catalogo (categoria_id);

-- ── Saldo (1:1 com o catálogo) ───────────────────────────────────────────────
create table if not exists public.epi_estoque (
  id uuid primary key default gen_random_uuid(),
  catalogo_id uuid not null unique references public.epi_catalogo(id) on delete cascade,
  quantidade_atual integer not null default 0,
  quantidade_minima integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ── Ledger de movimentações ──────────────────────────────────────────────────
create table if not exists public.epi_movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  catalogo_id uuid not null references public.epi_catalogo(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade integer not null check (quantidade > 0),
  motivo text,
  numero_nf text,
  usuario_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists epi_mov_catalogo_idx on public.epi_movimentacoes_estoque (catalogo_id);
create index if not exists epi_mov_data_idx on public.epi_movimentacoes_estoque (created_at);

-- ── Entrega ao colaborador ───────────────────────────────────────────────────
create table if not exists public.epi_entregas (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  catalogo_id uuid not null references public.epi_catalogo(id) on delete restrict,
  quantidade integer not null default 1 check (quantidade > 0),
  data_entrega date not null,
  data_prevista_troca date,
  data_devolucao date,
  motivo_entrega text not null,
  usuario_responsavel_id uuid references auth.users(id),
  observacoes text,
  motivo_devolucao text,
  condicao_devolucao text check (condicao_devolucao in ('aproveitavel', 'descarte')),
  created_at timestamptz not null default now()
);
create index if not exists epi_entregas_colaborador_idx on public.epi_entregas (colaborador_id);
create index if not exists epi_entregas_catalogo_idx on public.epi_entregas (catalogo_id);
create index if not exists epi_entregas_devolucao_idx on public.epi_entregas (data_devolucao);

-- ── Estoque: derivado pelos triggers ─────────────────────────────────────────
create trigger update_epi_catalogo_updated_at
  before update on public.epi_catalogo
  for each row execute function public.update_updated_at_column();

-- toda movimentação ajusta o saldo (fonte única da verdade)
create or replace function public.epi_aplica_movimentacao()
returns trigger language plpgsql as $$
begin
  update public.epi_estoque
    set quantidade_atual = quantidade_atual
          + (case when NEW.tipo = 'entrada' then NEW.quantidade else -NEW.quantidade end),
        updated_at = now()
  where catalogo_id = NEW.catalogo_id;
  return NEW;
end $$;
create trigger trg_epi_mov_aplica
  after insert on public.epi_movimentacoes_estoque
  for each row execute function public.epi_aplica_movimentacao();

-- entrega gera saída de estoque
create or replace function public.epi_entrega_saida()
returns trigger language plpgsql as $$
begin
  if NEW.data_devolucao is null then
    insert into public.epi_movimentacoes_estoque (catalogo_id, tipo, quantidade, motivo, usuario_id)
    values (NEW.catalogo_id, 'saida', NEW.quantidade, 'Entrega para colaborador', NEW.usuario_responsavel_id);
  end if;
  return NEW;
end $$;
create trigger trg_epi_entrega_saida
  after insert on public.epi_entregas
  for each row execute function public.epi_entrega_saida();

-- devolução aproveitável retorna ao estoque
create or replace function public.epi_entrega_devolucao()
returns trigger language plpgsql as $$
begin
  if OLD.data_devolucao is null and NEW.data_devolucao is not null
     and NEW.condicao_devolucao = 'aproveitavel' then
    insert into public.epi_movimentacoes_estoque (catalogo_id, tipo, quantidade, motivo, usuario_id)
    values (NEW.catalogo_id, 'entrada', NEW.quantidade, 'Devolução de EPI', NEW.usuario_responsavel_id);
  end if;
  return NEW;
end $$;
create trigger trg_epi_entrega_devolucao
  after update on public.epi_entregas
  for each row execute function public.epi_entrega_devolucao();

-- excluir entrega ativa estorna o estoque
create or replace function public.epi_entrega_estorno()
returns trigger language plpgsql as $$
begin
  if OLD.data_devolucao is null then
    insert into public.epi_movimentacoes_estoque (catalogo_id, tipo, quantidade, motivo, usuario_id)
    values (OLD.catalogo_id, 'entrada', OLD.quantidade, 'Estorno de entrega excluída', OLD.usuario_responsavel_id);
  end if;
  return OLD;
end $$;
create trigger trg_epi_entrega_estorno
  after delete on public.epi_entregas
  for each row execute function public.epi_entrega_estorno();

-- ── RLS (autenticado vê/gerencia) ────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'epi_categorias','epi_marcas','epi_catalogo','epi_estoque',
    'epi_movimentacoes_estoque','epi_entregas'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s: autenticado vê" on public.%I', t, t);
    execute format('drop policy if exists "%s: autenticado gerencia" on public.%I', t, t);
    execute format('create policy "%s: autenticado vê" on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy "%s: autenticado gerencia" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;
