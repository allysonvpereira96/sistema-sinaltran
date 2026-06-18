-- ============================================================================
-- Sinaltran · RH — ocorrências de movimentação (aumento de salário / troca de função)
--   Estende os tipos de ocorrência e guarda os valores anterior/novo no próprio
--   registro, para consulta posterior do que mudou.
-- ============================================================================

-- Novos tipos no CHECK de colaborador_ocorrencias
alter table public.colaborador_ocorrencias
  drop constraint if exists colaborador_ocorrencias_tipo_check;

alter table public.colaborador_ocorrencias
  add constraint colaborador_ocorrencias_tipo_check
  check (tipo in (
    'falta','atraso','atestado','advertencia','suspensao','elogio','observacao','outro',
    'aumento_salario','troca_funcao'
  ));

-- Valores anterior/novo preservados na própria ocorrência
alter table public.colaborador_ocorrencias add column if not exists valor_anterior numeric(12, 2);
alter table public.colaborador_ocorrencias add column if not exists valor_novo numeric(12, 2);
alter table public.colaborador_ocorrencias add column if not exists funcao_anterior text;
alter table public.colaborador_ocorrencias add column if not exists funcao_nova text;
