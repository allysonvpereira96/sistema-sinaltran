-- ============================================================================
-- Caderno Virtual · adiciona campo `observacoes` e índice por data
--   · A tabela `colaborador_ocorrencias` já existe (migration 0001 de RH).
--   · Aqui adicionamos `observacoes` (notas internas), índice em (data) para
--     consultas mensais rápidas e índice em (tipo) para o filtro do caderno.
-- ============================================================================

alter table public.colaborador_ocorrencias
  add column if not exists observacoes text;

create index if not exists colaborador_ocorrencias_data_idx
  on public.colaborador_ocorrencias (data);

create index if not exists colaborador_ocorrencias_tipo_idx
  on public.colaborador_ocorrencias (tipo);
