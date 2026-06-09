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
