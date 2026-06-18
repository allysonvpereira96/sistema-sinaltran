-- ============================================================================
-- Sinaltran · Controle de acesso por módulo
-- ----------------------------------------------------------------------------
-- Adiciona a coluna `modulos` em profiles. Cada item é a "key" de uma seção da
-- navegação (ver src/config/navigation.ts): comercial, obras, financeiro,
-- producao, pessoal, cadastros, gestao.
--
-- Usuários com role 'admin' (master) enxergam TODOS os módulos independente
-- desta coluna — a checagem fica na aplicação (proxy + sidebar). Para usuários
-- comuns, só os módulos listados aqui ficam visíveis/acessíveis.
--
-- RLS: a migration inicial (20260609000001_init.sql) já cria a policy
-- "Profiles: admin gerencia todos", então o master consegue ler/gravar esta
-- coluna em qualquer profile sem ajustes adicionais.
-- ============================================================================

alter table public.profiles
  add column if not exists modulos text[] not null default '{}';
