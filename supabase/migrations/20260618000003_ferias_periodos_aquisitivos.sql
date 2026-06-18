-- ============================================================================
-- RH · Períodos aquisitivos de férias
--   · A tabela `colaborador_ferias` existente continua representando GOZOS
--     (períodos efetivos de fruição agendados/concluídos).
--   · `colaborador_periodos_aquisitivos` espelha o relatório de
--     "Acompanhamento de vencimento de férias" da contabilidade: para cada
--     período aquisitivo do colaborador, quantos dias de DIREITO ele tem e
--     qual o prazo limite para iniciar sem gerar dobra.
-- ============================================================================

create table if not exists public.colaborador_periodos_aquisitivos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  -- Período aquisitivo (12 meses normalmente)
  aquisitivo_inicio date not null,
  aquisitivo_fim date not null,
  -- Saldo de dias de direito (não inteiro: 12,5 / 11,5 / 22,5 etc.)
  dias_direito numeric(5, 2) not null default 30,
  -- Período concessivo (em que pode/deve gozar — geralmente os 12 meses seguintes)
  concessivo_inicio date,
  concessivo_fim date,
  -- Data limite para INICIAR as férias sem gerar pagamento em dobro
  prazo_dobro date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Um colaborador não pode ter o mesmo período aquisitivo duplicado
  unique (colaborador_id, aquisitivo_inicio, aquisitivo_fim)
);

create index if not exists colaborador_periodos_aquisitivos_colab_idx
  on public.colaborador_periodos_aquisitivos (colaborador_id);

create index if not exists colaborador_periodos_aquisitivos_prazo_idx
  on public.colaborador_periodos_aquisitivos (prazo_dobro);

-- RLS
alter table public.colaborador_periodos_aquisitivos enable row level security;

drop policy if exists "periodos_aq: autenticado vê" on public.colaborador_periodos_aquisitivos;
drop policy if exists "periodos_aq: autenticado gerencia" on public.colaborador_periodos_aquisitivos;

create policy "periodos_aq: autenticado vê"
  on public.colaborador_periodos_aquisitivos for select to authenticated using (true);

create policy "periodos_aq: autenticado gerencia"
  on public.colaborador_periodos_aquisitivos for all to authenticated
  using (true) with check (true);

-- updated_at trigger (a função update_updated_at_column já existe)
drop trigger if exists update_periodos_aq_updated_at on public.colaborador_periodos_aquisitivos;
create trigger update_periodos_aq_updated_at
  before update on public.colaborador_periodos_aquisitivos
  for each row execute function public.update_updated_at_column();

-- ============================================================================
-- View: férias em risco de dobra
--   Junta períodos aquisitivos COM prazo definido aos dados do colaborador,
--   pronto para a página de Vencimentos.
-- ============================================================================
drop view if exists public.vw_ferias_risco_dobra;
create view public.vw_ferias_risco_dobra as
select
  pa.id as registro_id,
  pa.colaborador_id,
  c.nome_completo as colaborador,
  c.matricula,
  c.cargo,
  c.setor,
  pa.aquisitivo_inicio,
  pa.aquisitivo_fim,
  pa.dias_direito,
  pa.concessivo_inicio,
  pa.concessivo_fim,
  pa.prazo_dobro,
  (pa.prazo_dobro - current_date) as dias_para_dobra
from public.colaborador_periodos_aquisitivos pa
join public.colaboradores c on c.id = pa.colaborador_id
where pa.prazo_dobro is not null
  and c.status <> 'desligado';
