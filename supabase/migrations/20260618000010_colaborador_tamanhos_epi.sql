-- ============================================================================
-- Sinaltran · RH — tamanhos de EPI/uniforme do colaborador
--   Usados na entrega de EPI pelo Almoxarifado. (Espelha o LES.)
-- ============================================================================
alter table public.colaboradores add column if not exists tamanho_camisa text;
alter table public.colaboradores add column if not exists tamanho_calca text;
alter table public.colaboradores add column if not exists tamanho_calcado text;
alter table public.colaboradores add column if not exists tamanho_luva text;
alter table public.colaboradores add column if not exists tamanho_macacao text;
