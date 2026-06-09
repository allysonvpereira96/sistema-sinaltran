-- ============================================================================
-- Sinaltran · Migration inicial — tipos, helpers e autenticação
-- ============================================================================

-- Roles de aplicação
create type public.app_role as enum ('admin', 'user');

-- Status de orçamento
create type public.orcamento_status as enum (
  'rascunho',
  'enviado',
  'aprovado',
  'rejeitado',
  'perdido'
);

-- Status de obra
create type public.obra_status as enum (
  'planejamento',
  'em_andamento',
  'pausada',
  'concluida',
  'cancelada'
);

-- Status de medição
create type public.medicao_status as enum (
  'rascunho',
  'enviada',
  'aprovada',
  'rejeitada'
);

-- Profiles (estende auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text not null,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper: papel do usuário
create or replace function public.get_user_role(user_uuid uuid)
returns app_role
language sql
security definer
stable
as $$
  select role from public.profiles where id = user_uuid;
$$;

-- Helper: é admin?
create or replace function public.is_admin(user_uuid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = user_uuid and role = 'admin'
  );
$$;

-- Trigger genérico para updated_at
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- RLS profiles
create policy "Profiles: usuário vê o próprio"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles: usuário atualiza o próprio"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Profiles: admin vê todos"
  on public.profiles for select
  using (public.is_admin(auth.uid()));

create policy "Profiles: admin gerencia todos"
  on public.profiles for all
  using (public.is_admin(auth.uid()));

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- Auto-criação de profile no signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, nome, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nome', new.email),
    'user'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
-- ============================================================================
-- Sinaltran · Cadastros básicos
--   Empresas (Sinaltran/Sinalshop), Clientes, Fornecedores, Materiais,
--   Equipamentos, Tipos de mão de obra, Categorias financeiras, Centros de custo
-- ============================================================================

-- ============================================================================
-- EMPRESAS (entidades legais emissoras de orçamento)
--   · Sinaltran Sinalizações LTDA — placas, tachões, serviços
--   · Sinalshop — tintas
-- ============================================================================
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  razao_social text not null,
  cnpj text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  telefone text,
  email text,
  responsavel_padrao text,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.empresas enable row level security;

create policy "Empresas: autenticado vê"
  on public.empresas for select to authenticated using (true);

create policy "Empresas: admin gerencia"
  on public.empresas for all to authenticated
  using (public.is_admin(auth.uid()));

create trigger update_empresas_updated_at
  before update on public.empresas
  for each row execute function public.update_updated_at_column();

-- ============================================================================
-- CLIENTES (contratantes — prefeituras, DNIT, construtoras, privados)
-- ============================================================================
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text,
  cnpj_cpf text,
  tipo_pessoa text not null default 'juridica' check (tipo_pessoa in ('juridica', 'fisica', 'publico')),
  email text,
  telefone text,
  responsavel text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clientes_razao_social_idx on public.clientes (razao_social);
create index clientes_cnpj_cpf_idx on public.clientes (cnpj_cpf);

alter table public.clientes enable row level security;

create policy "Clientes: autenticado vê"
  on public.clientes for select to authenticated using (true);

create policy "Clientes: autenticado insere"
  on public.clientes for insert to authenticated with check (true);

create policy "Clientes: autenticado atualiza"
  on public.clientes for update to authenticated using (true);

create policy "Clientes: admin deleta"
  on public.clientes for delete to authenticated
  using (public.is_admin(auth.uid()));

create trigger update_clientes_updated_at
  before update on public.clientes
  for each row execute function public.update_updated_at_column();

-- ============================================================================
-- FORNECEDORES
-- ============================================================================
create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nome_fantasia text,
  cnpj_cpf text,
  telefone text,
  email text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fornecedores_nome_idx on public.fornecedores (nome);

alter table public.fornecedores enable row level security;

create policy "Fornecedores: autenticado vê"
  on public.fornecedores for select to authenticated using (true);

create policy "Fornecedores: autenticado insere"
  on public.fornecedores for insert to authenticated with check (true);

create policy "Fornecedores: autenticado atualiza"
  on public.fornecedores for update to authenticated using (true);

create policy "Fornecedores: admin deleta"
  on public.fornecedores for delete to authenticated
  using (public.is_admin(auth.uid()));

create trigger update_fornecedores_updated_at
  before update on public.fornecedores
  for each row execute function public.update_updated_at_column();

-- ============================================================================
-- MATERIAIS (tinta, esferas de vidro, placas, colunas, tachas, semáforos…)
-- ============================================================================
create type public.material_categoria as enum (
  'tinta',
  'esfera_vidro',
  'placa',
  'coluna',
  'tacha',
  'semaforo',
  'pelicula',
  'diluente',
  'fixador',
  'outro'
);

create table public.materiais (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  descricao text not null,
  categoria material_categoria not null default 'outro',
  unidade_medida text not null default 'UN',
  valor_referencia numeric(12, 2) default 0,
  estoque_minimo numeric(12, 3) default 0,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index materiais_descricao_idx on public.materiais (descricao);
create index materiais_categoria_idx on public.materiais (categoria);

alter table public.materiais enable row level security;

create policy "Materiais: autenticado vê"
  on public.materiais for select to authenticated using (true);

create policy "Materiais: autenticado insere"
  on public.materiais for insert to authenticated with check (true);

create policy "Materiais: autenticado atualiza"
  on public.materiais for update to authenticated using (true);

create policy "Materiais: admin deleta"
  on public.materiais for delete to authenticated
  using (public.is_admin(auth.uid()));

create trigger update_materiais_updated_at
  before update on public.materiais
  for each row execute function public.update_updated_at_column();

-- ============================================================================
-- EQUIPAMENTOS (caminhões, máquinas de pintura, equipamentos auxiliares)
-- ============================================================================
create type public.equipamento_tipo as enum (
  'veiculo',
  'maquina_pintura',
  'equipamento_auxiliar',
  'ferramenta',
  'outro'
);

create type public.equipamento_status as enum (
  'disponivel',
  'em_uso',
  'manutencao',
  'inativo'
);

create table public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  descricao text not null,
  tipo equipamento_tipo not null default 'outro',
  placa text,
  marca text,
  modelo text,
  ano integer,
  status equipamento_status not null default 'disponivel',
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index equipamentos_descricao_idx on public.equipamentos (descricao);
create index equipamentos_tipo_idx on public.equipamentos (tipo);

alter table public.equipamentos enable row level security;

create policy "Equipamentos: autenticado vê"
  on public.equipamentos for select to authenticated using (true);

create policy "Equipamentos: autenticado insere"
  on public.equipamentos for insert to authenticated with check (true);

create policy "Equipamentos: autenticado atualiza"
  on public.equipamentos for update to authenticated using (true);

create policy "Equipamentos: admin deleta"
  on public.equipamentos for delete to authenticated
  using (public.is_admin(auth.uid()));

create trigger update_equipamentos_updated_at
  before update on public.equipamentos
  for each row execute function public.update_updated_at_column();

-- ============================================================================
-- TIPOS DE MÃO DE OBRA
-- ============================================================================
create table public.tipos_mao_obra (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  valor_hora numeric(10, 2) default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tipos_mao_obra enable row level security;

create policy "TiposMaoObra: autenticado vê"
  on public.tipos_mao_obra for select to authenticated using (true);

create policy "TiposMaoObra: admin gerencia"
  on public.tipos_mao_obra for all to authenticated
  using (public.is_admin(auth.uid()));

create trigger update_tipos_mao_obra_updated_at
  before update on public.tipos_mao_obra
  for each row execute function public.update_updated_at_column();

-- ============================================================================
-- CATEGORIAS FINANCEIRAS + CENTROS DE CUSTO
-- ============================================================================
create table public.categorias_financeiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'despesa' check (tipo in ('despesa', 'receita')),
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categorias_financeiras enable row level security;

create policy "Categorias: autenticado vê"
  on public.categorias_financeiras for select to authenticated using (true);

create policy "Categorias: admin gerencia"
  on public.categorias_financeiras for all to authenticated
  using (public.is_admin(auth.uid()));

create trigger update_categorias_updated_at
  before update on public.categorias_financeiras
  for each row execute function public.update_updated_at_column();

create table public.centros_custo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.centros_custo enable row level security;

create policy "CentrosCusto: autenticado vê"
  on public.centros_custo for select to authenticated using (true);

create policy "CentrosCusto: admin gerencia"
  on public.centros_custo for all to authenticated
  using (public.is_admin(auth.uid()));

create trigger update_centros_custo_updated_at
  before update on public.centros_custo
  for each row execute function public.update_updated_at_column();

-- ============================================================================
-- SEED — dados iniciais úteis (idempotente via on conflict do nothing)
-- ============================================================================
insert into public.tipos_mao_obra (nome) values
  ('Encarregado'),
  ('Operador de máquina'),
  ('Pintor'),
  ('Ajudante'),
  ('Motorista')
on conflict (nome) do nothing;

insert into public.categorias_financeiras (nome, tipo) values
  ('Materiais', 'despesa'),
  ('Combustível', 'despesa'),
  ('Manutenção de equipamentos', 'despesa'),
  ('Folha de pagamento', 'despesa'),
  ('Impostos', 'despesa'),
  ('Aluguel', 'despesa'),
  ('Serviços de terceiros', 'despesa'),
  ('Receita de obras', 'receita');

insert into public.empresas (
  nome, razao_social, cnpj, endereco, cidade, estado,
  responsavel_padrao, email
) values
  (
    'Sinaltran',
    'SINALTRAN SINALIZAÇÕES LTDA',
    '05.336.209/0001-44',
    'Estrada Manoel de Souza Rosa, 3065',
    'Gravataí',
    'RS',
    'Vinicius Silva',
    'vendas.sinaltranrs@gmail.com'
  ),
  (
    'Sinalshop',
    'SINALSHOP',
    null,
    null,
    null,
    'RS',
    null,
    null
  );
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
  empresa_id uuid references public.empresas(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  responsavel text,
  descricao text,
  endereco text,
  cidade text,
  estado text,
  engenheiro_responsavel text,
  crea_engenheiro text,
  prazo_execucao text,
  condicoes_pagamento text,
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
create index orcamentos_empresa_idx on public.orcamentos (empresa_id);
create index orcamentos_status_idx on public.orcamentos (status);

create table public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  secao text,                          -- ex: "SINALIZAÇÃO HORIZONTAL"
  ordem int not null default 0,        -- ordem dentro da seção (1.1, 1.2, ...)
  material_id uuid references public.materiais(id) on delete set null,
  descricao text not null,
  unidade_medida text not null default 'UN',
  quantidade numeric(12, 3) not null default 1,
  valor_unit_mao_obra numeric(12, 2) not null default 0,
  valor_unit_material numeric(12, 2) not null default 0,
  valor_total_mao_obra numeric(15, 2) not null default 0,
  valor_total_material numeric(15, 2) not null default 0,
  valor_total numeric(15, 2) not null default 0,
  observacoes text,
  created_at timestamptz not null default now()
);

create index orcamento_itens_orcamento_idx on public.orcamento_itens (orcamento_id);
create index orcamento_itens_secao_idx on public.orcamento_itens (orcamento_id, secao);

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
  empresa_id uuid references public.empresas(id) on delete set null,
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
create index obras_empresa_idx on public.obras (empresa_id);
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
