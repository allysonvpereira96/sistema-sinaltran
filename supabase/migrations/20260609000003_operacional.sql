-- ============================================================================
-- Sinaltran · Operacional
--   Orçamentos, Obras, Medições, Compras, Contas a pagar, Colaboradores
-- ============================================================================

-- ============================================================================
-- ORÇAMENTOS (proposta comercial — vira obra com 1 clique)
-- ============================================================================
create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente_id uuid references public.clientes(id) on delete set null,
  responsavel text,
  descricao text,
  endereco text,
  cidade text,
  estado text,
  valor_total numeric(15, 2) not null default 0,
  status orcamento_status not null default 'rascunho',
  data_envio date,
  data_validade date,
  data_aprovacao date,
  observacoes text,
  obra_id uuid, -- preenchido após conversão (FK adicionada após obras)
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orcamentos_cliente_idx on public.orcamentos (cliente_id);
create index orcamentos_status_idx on public.orcamentos (status);

create table public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  ordem int not null default 0,
  material_id uuid references public.materiais(id) on delete set null,
  descricao text not null,
  unidade_medida text not null default 'UN',
  quantidade numeric(12, 3) not null default 1,
  valor_unitario numeric(12, 2) not null default 0,
  valor_total numeric(15, 2) not null default 0,
  observacoes text,
  created_at timestamptz not null default now()
);

create index orcamento_itens_orcamento_idx on public.orcamento_itens (orcamento_id);

alter table public.orcamentos enable row level security;
alter table public.orcamento_itens enable row level security;

create policy "Orcamentos: autenticado vê"
  on public.orcamentos for select to authenticated using (true);

create policy "Orcamentos: autenticado gerencia"
  on public.orcamentos for all to authenticated
  using (auth.uid() = user_id or public.is_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "OrcamentoItens: autenticado vê"
  on public.orcamento_itens for select to authenticated using (true);

create policy "OrcamentoItens: autenticado gerencia"
  on public.orcamento_itens for all to authenticated
  using (true) with check (true);

create trigger update_orcamentos_updated_at
  before update on public.orcamentos
  for each row execute function public.update_updated_at_column();

-- ============================================================================
-- OBRAS
-- ============================================================================
create table public.obras (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente_id uuid references public.clientes(id) on delete set null,
  orcamento_id uuid references public.orcamentos(id) on delete set null,
  nome text not null,
  responsavel text,
  endereco text,
  cidade text,
  estado text,
  valor_total numeric(15, 2) not null default 0,
  mao_obra_direta numeric(15, 2) not null default 0,
  mao_obra_indireta numeric(15, 2) not null default 0,
  status obra_status not null default 'planejamento',
  data_inicio date,
  data_fim_prevista date,
  data_fim_real date,
  observacoes text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index obras_cliente_idx on public.obras (cliente_id);
create index obras_status_idx on public.obras (status);

alter table public.obras enable row level security;

create policy "Obras: autenticado vê"
  on public.obras for select to authenticated using (true);

create policy "Obras: autenticado gerencia"
  on public.obras for all to authenticated
  using (auth.uid() = user_id or public.is_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create trigger update_obras_updated_at
  before update on public.obras
  for each row execute function public.update_updated_at_column();

-- FK reversa: orcamento → obra (após criação da obra)
alter table public.orcamentos
  add constraint orcamentos_obra_id_fkey
  foreign key (obra_id) references public.obras(id) on delete set null;

-- ============================================================================
-- MEDIÇÕES (contas a receber — vinculadas à obra)
-- ============================================================================
create table public.medicoes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  numero integer not null,
  data_inicio date not null,
  data_fim date not null,
  valor_total numeric(15, 2) not null default 0,
  percentual_executado numeric(5, 2) not null default 0,
  status medicao_status not null default 'rascunho',
  observacoes text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (obra_id, numero)
);

create index medicoes_obra_idx on public.medicoes (obra_id);

alter table public.medicoes enable row level security;

create policy "Medicoes: autenticado vê"
  on public.medicoes for select to authenticated using (true);

create policy "Medicoes: autenticado gerencia"
  on public.medicoes for all to authenticated
  using (auth.uid() = user_id or public.is_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create trigger update_medicoes_updated_at
  before update on public.medicoes
  for each row execute function public.update_updated_at_column();

-- ============================================================================
-- COMPRAS
-- ============================================================================
create table public.compras (
  id uuid primary key default gen_random_uuid(),
  numero_pedido serial,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  obra_id uuid references public.obras(id) on delete set null,
  data_compra date not null default current_date,
  data_previsao date,
  numero_nf text,
  serie_nf text,
  chave_nfe text,
  valor_total numeric(15, 2) not null default 0,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recebido', 'cancelado')),
  observacoes text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index compras_fornecedor_idx on public.compras (fornecedor_id);
create index compras_obra_idx on public.compras (obra_id);

create table public.compra_itens (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras(id) on delete cascade,
  material_id uuid references public.materiais(id) on delete set null,
  descricao text not null,
  codigo text,
  unidade text not null default 'UN',
  quantidade numeric(12, 3) not null default 1,
  valor_unitario numeric(12, 2) not null default 0,
  valor_total numeric(15, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index compra_itens_compra_idx on public.compra_itens (compra_id);

alter table public.compras enable row level security;
alter table public.compra_itens enable row level security;

create policy "Compras: autenticado vê"
  on public.compras for select to authenticated using (true);

create policy "Compras: autenticado gerencia"
  on public.compras for all to authenticated
  using (auth.uid() = user_id or public.is_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "CompraItens: autenticado vê"
  on public.compra_itens for select to authenticated using (true);

create policy "CompraItens: autenticado gerencia"
  on public.compra_itens for all to authenticated
  using (true) with check (true);

create trigger update_compras_updated_at
  before update on public.compras
  for each row execute function public.update_updated_at_column();

-- ============================================================================
-- CONTAS A PAGAR
-- ============================================================================
create table public.contas_pagar (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  categoria_id uuid references public.categorias_financeiras(id) on delete set null,
  centro_custo_id uuid references public.centros_custo(id) on delete set null,
  obra_id uuid references public.obras(id) on delete set null,
  compra_id uuid references public.compras(id) on delete set null,
  descricao text not null,
  codigo_referencia text,
  data_competencia date,
  data_vencimento date not null,
  data_pagamento date,
  valor_original numeric(15, 2) not null default 0,
  valor_pago numeric(15, 2) not null default 0,
  juros numeric(15, 2) not null default 0,
  multa numeric(15, 2) not null default 0,
  desconto numeric(15, 2) not null default 0,
  valor_total_pago numeric(15, 2) not null default 0,
  valor_em_aberto numeric(15, 2) not null default 0,
  situacao text not null default 'em_aberto'
    check (situacao in ('em_aberto', 'pago', 'pago_parcial', 'vencido', 'cancelado')),
  forma_pagamento text,
  numero_nota_fiscal text,
  numero_parcela text,
  observacoes text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contas_pagar_fornecedor_idx on public.contas_pagar (fornecedor_id);
create index contas_pagar_vencimento_idx on public.contas_pagar (data_vencimento);
create index contas_pagar_situacao_idx on public.contas_pagar (situacao);

alter table public.contas_pagar enable row level security;

create policy "ContasPagar: autenticado vê"
  on public.contas_pagar for select to authenticated using (true);

create policy "ContasPagar: autenticado gerencia"
  on public.contas_pagar for all to authenticated
  using (auth.uid() = user_id or public.is_admin(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create trigger update_contas_pagar_updated_at
  before update on public.contas_pagar
  for each row execute function public.update_updated_at_column();

-- ============================================================================
-- COLABORADORES (versão enxuta — sem D4Sign, recrutamento, EPI signature)
-- ============================================================================
create type public.colaborador_status as enum (
  'ativo',
  'afastado',
  'ferias',
  'desligado'
);

create table public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references public.obras(id) on delete set null,
  matricula text,
  nome_completo text not null,
  cpf text unique,
  rg text,
  data_nascimento date,
  data_admissao date not null,
  data_desligamento date,
  genero text check (genero in ('masculino', 'feminino', 'outro', 'nao_informado')),
  pis text,
  cnh text,
  cnh_validade date,
  email text,
  telefone text,
  foto_url text,
  endereco text,
  cidade text,
  estado text default 'RS',
  cep text,
  cargo text not null,
  tipo_mao_obra_id uuid references public.tipos_mao_obra(id) on delete set null,
  remuneracao_base numeric(12, 2),
  ajuda_custo numeric(12, 2) default 0,
  banco text,
  agencia text,
  conta text,
  chave_pix text,
  emergencia_nome text,
  emergencia_parentesco text,
  emergencia_telefone text,
  status colaborador_status not null default 'ativo',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index colaboradores_nome_idx on public.colaboradores (nome_completo);
create index colaboradores_status_idx on public.colaboradores (status);
create index colaboradores_obra_idx on public.colaboradores (obra_id);

alter table public.colaboradores enable row level security;

create policy "Colaboradores: autenticado vê"
  on public.colaboradores for select to authenticated using (true);

create policy "Colaboradores: autenticado insere"
  on public.colaboradores for insert to authenticated with check (true);

create policy "Colaboradores: autenticado atualiza"
  on public.colaboradores for update to authenticated using (true);

create policy "Colaboradores: admin deleta"
  on public.colaboradores for delete to authenticated
  using (public.is_admin(auth.uid()));

create trigger update_colaboradores_updated_at
  before update on public.colaboradores
  for each row execute function public.update_updated_at_column();
