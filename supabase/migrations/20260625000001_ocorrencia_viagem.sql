-- ============================================================================
-- Sinaltran · RH — adiciona o tipo "viagem" ao CHECK de colaborador_ocorrencias
-- (a feature de Viagem no Caderno Virtual reusa dias_atestado/data_fim, mas o
-- CHECK de `tipo` precisava incluir 'viagem').
-- ============================================================================
alter table public.colaborador_ocorrencias
  drop constraint if exists colaborador_ocorrencias_tipo_check;

alter table public.colaborador_ocorrencias
  add constraint colaborador_ocorrencias_tipo_check
  check (tipo in (
    'falta','atraso','atestado','advertencia','suspensao','elogio','observacao','outro',
    'aumento_salario','troca_funcao','banco_horas','viagem'
  ));
