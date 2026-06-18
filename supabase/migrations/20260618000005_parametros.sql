-- ============================================================================
-- Sinaltran · Parâmetros do sistema (chave-valor)
--   Valores configuráveis pela UI (ex.: salário mínimo p/ insalubridade).
--   Extensível: novos parâmetros entram só com um INSERT.
-- ============================================================================
create table if not exists public.parametros (
  chave text primary key,
  valor text not null,
  descricao text,
  grupo text,
  updated_at timestamptz not null default now()
);

alter table public.parametros enable row level security;

drop policy if exists "Parametros: autenticado vê" on public.parametros;
drop policy if exists "Parametros: autenticado gerencia" on public.parametros;

create policy "Parametros: autenticado vê"
  on public.parametros for select to authenticated using (true);
create policy "Parametros: autenticado gerencia"
  on public.parametros for all to authenticated using (true) with check (true);

create trigger update_parametros_updated_at
  before update on public.parametros
  for each row execute function public.update_updated_at_column();

-- Seed inicial
insert into public.parametros (chave, valor, descricao, grupo) values
  ('salario_minimo', '1621', 'Salário mínimo nacional vigente — base de cálculo da insalubridade', 'RH')
on conflict (chave) do nothing;
