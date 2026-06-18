-- ============================================================================
-- Sinaltran · RH — Banco de horas como ocorrência
--   Novo tipo "banco_horas" + coluna horas_minutos (com sinal):
--   positivo = crédito (soma), negativo = débito (decréscimo).
-- ============================================================================
alter table public.colaborador_ocorrencias
  drop constraint if exists colaborador_ocorrencias_tipo_check;

alter table public.colaborador_ocorrencias
  add constraint colaborador_ocorrencias_tipo_check
  check (tipo in (
    'falta','atraso','atestado','advertencia','suspensao','elogio','observacao','outro',
    'aumento_salario','troca_funcao','banco_horas'
  ));

alter table public.colaborador_ocorrencias
  add column if not exists horas_minutos integer;
