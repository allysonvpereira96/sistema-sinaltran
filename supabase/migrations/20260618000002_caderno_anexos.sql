-- ============================================================================
-- Caderno Virtual · anexos e período de afastamento
--   · dias_atestado: nº de dias do atestado/suspensão (período de afastamento)
--   · data_fim: último dia do período (calculado pelo backend a partir de
--     `data` + `dias_atestado` - 1; armazenado pra facilitar consultas
--     "quem está afastado hoje?")
--   · anexo_url: path do arquivo no bucket `colaborador-documentos`
--   · anexo_nome: nome original do arquivo (pra exibir/download)
-- ============================================================================

alter table public.colaborador_ocorrencias
  add column if not exists dias_atestado integer
    check (dias_atestado is null or dias_atestado > 0);

alter table public.colaborador_ocorrencias
  add column if not exists data_fim date;

alter table public.colaborador_ocorrencias
  add column if not exists anexo_url text;

alter table public.colaborador_ocorrencias
  add column if not exists anexo_nome text;

-- Índice por data_fim pra consultas "afastados hoje" / período corrente
create index if not exists colaborador_ocorrencias_data_fim_idx
  on public.colaborador_ocorrencias (data_fim);
