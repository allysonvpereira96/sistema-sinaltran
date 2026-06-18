-- ============================================================================
-- Sinaltran · RH — campos da Ficha de Registro de Empregado
--   Dados que a ficha traz e o cadastro ainda não guardava: filiação, dados
--   civis, documentos trabalhistas e parâmetros contratuais.
-- ============================================================================

-- ── Filiação / dados civis ───────────────────────────────────────────────────
alter table public.colaboradores add column if not exists nome_pai text;
alter table public.colaboradores add column if not exists nome_mae text;
alter table public.colaboradores add column if not exists estado_civil text;
alter table public.colaboradores add column if not exists naturalidade text;
alter table public.colaboradores add column if not exists naturalidade_uf text;
alter table public.colaboradores add column if not exists nacionalidade text;
alter table public.colaboradores add column if not exists raca_cor text;
alter table public.colaboradores add column if not exists grau_instrucao text;

-- ── Documentos trabalhistas ──────────────────────────────────────────────────
alter table public.colaboradores add column if not exists ctps_numero text;
alter table public.colaboradores add column if not exists ctps_serie text;
alter table public.colaboradores add column if not exists titulo_eleitor text;
alter table public.colaboradores add column if not exists cbo text;
alter table public.colaboradores add column if not exists matricula_esocial text;

-- ── Parâmetros contratuais ───────────────────────────────────────────────────
alter table public.colaboradores add column if not exists insalubridade_pct numeric(5, 2) not null default 0;
alter table public.colaboradores add column if not exists periculosidade_pct numeric(5, 2) not null default 0;
alter table public.colaboradores add column if not exists sindicato text;
alter table public.colaboradores add column if not exists horario_trabalho text;
