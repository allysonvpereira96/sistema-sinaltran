-- ============================================================================
-- Sinaltran · RH — Controle de vencimentos (ASO, Treinamentos, Experiência)
-- Origem: planilha "Sistema Controle DP". Adiciona setor/gestor ao cadastro,
-- cria as tabelas de ASO, treinamentos e experiência, e uma view unificada
-- de vencimentos para o painel gerencial.
-- ============================================================================

-- ── Cadastro: setor e gestor ─────────────────────────────────────────────────
alter table public.colaboradores add column if not exists setor text;
alter table public.colaboradores add column if not exists gestor text;
create index if not exists colaboradores_setor_idx on public.colaboradores (setor);

-- ── ASO (exames ocupacionais) ────────────────────────────────────────────────
-- vencimento é derivado: data_realizacao + periodicidade (em meses).
create table if not exists public.colaborador_aso (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  tipo_exame text not null default 'periodico'
    check (tipo_exame in ('admissional','periodico','demissional','mudanca_funcao','retorno_trabalho')),
  data_realizacao date,
  periodicidade_meses integer not null default 12,   -- Anual=12, Bienal=24
  vencimento date generated always as
    (((data_realizacao + make_interval(months => periodicidade_meses)))::date) stored,
  resultado text check (resultado in ('apto','inapto','apto_com_restricoes')),
  responsavel text,
  observacoes text,
  anexo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index if not exists colaborador_aso_colaborador_idx on public.colaborador_aso (colaborador_id);
create index if not exists colaborador_aso_vencimento_idx on public.colaborador_aso (vencimento);

-- ── Treinamentos (NRs, cursos) ───────────────────────────────────────────────
create table if not exists public.colaborador_treinamentos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  treinamento text not null,                          -- ex.: "NR-35", "NR-10"
  data_realizacao date,
  validade_meses integer,                             -- null = sem validade/permanente
  vencimento date generated always as
    (case when validade_meses is null then null
          else ((data_realizacao + make_interval(months => validade_meses)))::date end) stored,
  fornecedor_instrutor text,
  observacoes text,
  anexo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index if not exists colaborador_treinamentos_colaborador_idx on public.colaborador_treinamentos (colaborador_id);
create index if not exists colaborador_treinamentos_vencimento_idx on public.colaborador_treinamentos (vencimento);

-- ── Experiência (contrato de experiência) ────────────────────────────────────
create table if not exists public.colaborador_experiencia (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  marco_30 date,
  marco_45 date,
  marco_60 date,
  marco_90 date,
  avaliacao text,
  observacoes text,
  created_at timestamptz not null default now()
);
create index if not exists colaborador_experiencia_colaborador_idx on public.colaborador_experiencia (colaborador_id);

-- ── View unificada de vencimentos (ASO + Treinamentos + Férias) ──────────────
-- dias_para_vencer é calculado em tempo de consulta; a classificação por
-- limiar (30/60 dias) fica na aplicação para ser configurável.
create or replace view public.vw_colaborador_vencimentos
with (security_invoker = true) as
  select
    'ASO'::text                              as tipo,
    a.id                                     as registro_id,
    c.id                                     as colaborador_id,
    c.nome_completo                          as colaborador,
    c.setor                                  as setor,
    coalesce(a.tipo_exame, 'periodico')      as descricao,
    a.vencimento                             as vencimento,
    (a.vencimento - current_date)            as dias_para_vencer
  from public.colaborador_aso a
  join public.colaboradores c on c.id = a.colaborador_id
  where a.vencimento is not null

  union all
  select
    'Treinamento'::text,
    t.id,
    c.id,
    c.nome_completo,
    c.setor,
    t.treinamento,
    t.vencimento,
    (t.vencimento - current_date)
  from public.colaborador_treinamentos t
  join public.colaboradores c on c.id = t.colaborador_id
  where t.vencimento is not null

  union all
  -- Limite concessivo = fim do período aquisitivo + 12 meses (regra CLT).
  select
    'Férias'::text,
    f.id,
    c.id,
    c.nome_completo,
    c.setor,
    'Limite concessivo'::text,
    ((f.periodo_aquisitivo_fim + interval '12 months')::date),
    (((f.periodo_aquisitivo_fim + interval '12 months')::date) - current_date)
  from public.colaborador_ferias f
  join public.colaboradores c on c.id = f.colaborador_id
  where f.periodo_aquisitivo_fim is not null
    and f.status <> 'concluida';

-- ── RLS (padrão do projeto: autenticado vê/gerencia) ─────────────────────────
alter table public.colaborador_aso enable row level security;
alter table public.colaborador_treinamentos enable row level security;
alter table public.colaborador_experiencia enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'colaborador_aso','colaborador_treinamentos','colaborador_experiencia'
  ] loop
    execute format('drop policy if exists "%s: autenticado vê" on public.%I', t, t);
    execute format('drop policy if exists "%s: autenticado gerencia" on public.%I', t, t);
    execute format(
      'create policy "%s: autenticado vê" on public.%I for select to authenticated using (true)', t, t);
    execute format(
      'create policy "%s: autenticado gerencia" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;
