-- ============================================================================
-- Sinaltran · Normalização de CNPJ/CPF + índices únicos parciais
--   · CNPJ/CPF passa a ser sempre armazenado em formato digit-only
--   · Índices únicos parciais permitem UPSERT na importação em massa
--   · Índices trigram (pg_trgm) aceleram busca por nome/razão social
-- ============================================================================

-- Extensão para busca fuzzy/parcial eficiente
create extension if not exists pg_trgm;

-- Normalizar dados existentes (digit-only) — idempotente
update public.clientes
  set cnpj_cpf = regexp_replace(cnpj_cpf, '[^0-9]', '', 'g')
  where cnpj_cpf is not null
    and cnpj_cpf <> regexp_replace(cnpj_cpf, '[^0-9]', '', 'g');

update public.fornecedores
  set cnpj_cpf = regexp_replace(cnpj_cpf, '[^0-9]', '', 'g')
  where cnpj_cpf is not null
    and cnpj_cpf <> regexp_replace(cnpj_cpf, '[^0-9]', '', 'g');

update public.empresas
  set cnpj = regexp_replace(cnpj, '[^0-9]', '', 'g')
  where cnpj is not null
    and cnpj <> regexp_replace(cnpj, '[^0-9]', '', 'g');

-- Índices únicos parciais (permitem UPSERT por CNPJ/CPF, tolerantes a null/vazio)
create unique index if not exists clientes_cnpj_cpf_unique
  on public.clientes (cnpj_cpf)
  where cnpj_cpf is not null and cnpj_cpf <> '';

create unique index if not exists fornecedores_cnpj_cpf_unique
  on public.fornecedores (cnpj_cpf)
  where cnpj_cpf is not null and cnpj_cpf <> '';

-- Índices trigram para autocomplete por nome / razão social / nome fantasia
create index if not exists clientes_razao_social_trgm
  on public.clientes using gin (razao_social gin_trgm_ops);

create index if not exists clientes_nome_fantasia_trgm
  on public.clientes using gin (nome_fantasia gin_trgm_ops);

create index if not exists fornecedores_nome_trgm
  on public.fornecedores using gin (nome gin_trgm_ops);

create index if not exists fornecedores_nome_fantasia_trgm
  on public.fornecedores using gin (nome_fantasia gin_trgm_ops);
