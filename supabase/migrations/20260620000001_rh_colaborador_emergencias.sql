-- ============================================================================
-- Sinaltran · RH — contatos de emergência (vários por colaborador)
-- Substitui as colunas emergencia_* de public.colaboradores por uma tabela-filha.
-- As colunas antigas permanecem (deprecadas) e os dados são copiados abaixo.
-- ============================================================================

create table if not exists public.colaborador_emergencias (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  nome text not null,
  parentesco text,
  telefone text,
  created_at timestamptz not null default now()
);
create index if not exists colaborador_emergencias_colaborador_idx
  on public.colaborador_emergencias (colaborador_id);

-- ── RLS (padrão: autenticado vê/gerencia) ────────────────────────────────────
alter table public.colaborador_emergencias enable row level security;

drop policy if exists "colaborador_emergencias: autenticado vê" on public.colaborador_emergencias;
drop policy if exists "colaborador_emergencias: autenticado gerencia" on public.colaborador_emergencias;

create policy "colaborador_emergencias: autenticado vê"
  on public.colaborador_emergencias for select to authenticated using (true);
create policy "colaborador_emergencias: autenticado gerencia"
  on public.colaborador_emergencias for all to authenticated using (true) with check (true);

-- ── Migra o contato único existente para a nova tabela ───────────────────────
insert into public.colaborador_emergencias (colaborador_id, nome, parentesco, telefone)
select id, emergencia_nome, emergencia_parentesco, emergencia_telefone
from public.colaboradores
where emergencia_nome is not null and btrim(emergencia_nome) <> ''
  and not exists (
    select 1 from public.colaborador_emergencias e
    where e.colaborador_id = colaboradores.id
  );

-- Colunas emergencia_* de public.colaboradores ficam deprecadas (não removidas
-- aqui para preservar histórico). Podem ser descartadas futuramente com:
--   alter table public.colaboradores
--     drop column emergencia_nome,
--     drop column emergencia_parentesco,
--     drop column emergencia_telefone;
