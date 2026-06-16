-- ============================================================================
-- Sinaltran · RH — Catálogo de treinamentos/NRs (editável pela tela)
-- Lista de treinamentos com validade padrão sugerida; alimenta o select da
-- aba Treinamentos do colaborador.
-- ============================================================================

create table if not exists public.treinamentos_catalogo (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  validade_meses integer,          -- null = sem validade/reciclagem fixa
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.treinamentos_catalogo enable row level security;

drop policy if exists "treinamentos_catalogo: autenticado vê" on public.treinamentos_catalogo;
drop policy if exists "treinamentos_catalogo: autenticado gerencia" on public.treinamentos_catalogo;
create policy "treinamentos_catalogo: autenticado vê"
  on public.treinamentos_catalogo for select to authenticated using (true);
create policy "treinamentos_catalogo: autenticado gerencia"
  on public.treinamentos_catalogo for all to authenticated using (true) with check (true);

-- Seed inicial (mesma lista que estava fixa no código). Idempotente.
insert into public.treinamentos_catalogo (nome, validade_meses) values
  ('NR-06 — EPI', null),
  ('NR-10 — Segurança em instalações elétricas', 24),
  ('NR-11 — Movimentação de materiais', 12),
  ('NR-12 — Máquinas e equipamentos', 24),
  ('NR-17 — Ergonomia', 24),
  ('NR-18 — Construção civil', 12),
  ('NR-20 — Inflamáveis e combustíveis', 12),
  ('NR-23 — Proteção contra incêndios', 12),
  ('NR-33 — Espaços confinados', 12),
  ('NR-35 — Trabalho em altura', 24),
  ('Direção defensiva', 12),
  ('Sinalização e segurança viária', 12),
  ('Primeiros socorros', 12),
  ('Brigada de incêndio', 12),
  ('CIPA', 12)
on conflict (nome) do nothing;
