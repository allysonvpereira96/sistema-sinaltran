-- ============================================================================
-- Sinaltran · Cadastro de Serviços
--   Catálogo de serviços prestados (sinalização horizontal/vertical/óptica,
--   semafórica, projetos, locação…). Cada serviço terá futuramente um
--   PREÇO PADRÃO por m² ou unidade, usado para montar orçamentos.
--   Base fiscal mínima (LC 116 + ISS) já incluída para NFS-e futura.
-- ============================================================================

create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text not null,
  descricao_completa text,
  categoria text,
  codigo_lc116 text,
  codigo_municipio text,
  unidade_padrao text,                       -- 'm2' | 'unidade' | 'metro' | 'diaria' | 'global' | 'hora' | null
  preco_unitario numeric(12, 2) not null default 0,
  aliquota_iss numeric(5, 2) not null default 0,
  retem_iss boolean not null default false,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index servicos_descricao_idx on public.servicos (descricao);
create index servicos_categoria_idx on public.servicos (categoria);

alter table public.servicos enable row level security;

create policy "Servicos: autenticado vê"
  on public.servicos for select to authenticated using (true);

create policy "Servicos: autenticado insere"
  on public.servicos for insert to authenticated with check (true);

create policy "Servicos: autenticado atualiza"
  on public.servicos for update to authenticated using (true);

create policy "Servicos: admin deleta"
  on public.servicos for delete to authenticated
  using (public.is_admin(auth.uid()));

create trigger update_servicos_updated_at
  before update on public.servicos
  for each row execute function public.update_updated_at_column();

-- ============================================================================
-- SEED — 13 serviços da Sinaltran (export NFS-e SINALTRAN_Servicos.xlsx)
--   unidade_padrao e preco_unitario ficam em branco/0 — preencher pela tela.
-- ============================================================================
insert into public.servicos
  (codigo, descricao, descricao_completa, categoria, codigo_lc116, codigo_municipio, aliquota_iss, retem_iss, ativo)
values
  ('SRV00001', 'SERVIÇO DE SINALIZAÇÃO VIÁRIA HORIZONTAL', 'SERVIÇO DE SINALIZAÇÃO VIÁRIA HORIZONTAL', 'SERVIÇO DE SINALIZAÇÃO VIÁRIA HORIZONTAL', '7.02', '70202', 4.00, true, true),
  ('SRV00002', 'SERVIÇO DE SINALIZAÇÃO VERTICAL, INSTALAÇÃO PLACAS', 'SERVIÇO DE SINALIZAÇÃO VIÁRIA VERTICAL', 'SERVIÇO DE SINALIZAÇÃO VERTICAL', '7.02', '70202', 4.00, true, true),
  ('SRV00003', 'SERVIÇO DE SINALIZAÇÃO ÓPTICA,INSTALAÇÃO TACHÕES E TACHAS', 'SERVIÇO DE SINALIZAÇÃO VIÁRIA ÓPTICA', 'SERVIÇO DE SINALIZAÇÃO ÓPTICA', '7.02', '70202', 4.00, true, true),
  ('SRV00004', 'SERVIÇO DE PINTURA EPOXI', 'SERVIÇO DE PINTURA EPOXI', 'SERVIÇO SINALIZAÇÃO EPOXI', '7.02', '70202', 4.00, true, true),
  ('SRV00005', 'SERVIÇO DE INSTALAÇÃO DE DEFENSA METÁLICA', 'SERVIÇO DE INSTALAÇÃO DE DEFENSA METÁLICA', 'PRESTAÇÃO DE SERVIÇO DE 3º / DEFESA / PROJETO', '7.02', '70202', 4.00, true, true),
  ('SRV00006', 'SERVIÇO EXECUÇÃO PROJETO SINALIZAÇÃO', 'SERVIÇO EXECUÇÃO PROJETO SINALIZAÇÃO', 'PRESTAÇÃO DE SERVIÇO DE 3º / DEFESA / PROJETO', '7.02', '70202', 4.00, true, true),
  ('SRV00007', 'INSTALAÇÃO E MONTAGEM APARELHOS E EQUIP INDUSTRIA', 'INSTALAÇÃO E MONTAGEM APARELHOS E EQUIP INDUSTRIA', 'PRESTAÇÃO DE SERVIÇO DE 3º / DEFESA / PROJETO', '14.06', '70202', 4.00, true, true),
  ('SRV00008', 'SERVIÇO DE MEDIÇÃO DE RETORREFLETANCIA', 'SERVIÇO DE MEDIÇÃO DE RETORREFLETANCIA', 'SINALIZAÇÃO HORIZONTAL', '7.05', '070502', 4.00, true, true),
  ('SRV00009', 'SERVIÇO MOBILIZAÇÃO', 'SERVIÇO MOBILIZAÇÃO', 'SINALIZAÇÃO HORIZONTAL', '7.02', '70202', 0.00, false, true),
  ('SRV00010', 'LOCAÇÃO DE EQUIPAMENTOS DE SINALIZAÇÃO', 'LOCAÇÃO DE SEMÁFORO', 'SINALIZAÇÃO SEMAFÓRICA', '3.04', '030403', 5.00, false, true),
  ('SRV00011', 'SERVIÇO DE SINALIZAÇÃO SEMAFÓRICA', 'SERVIÇO DE SINALIZAÇÃO SEMÁFORO', 'SINALIZAÇÃO SEMAFÓRICA', '7.02', '70202', 5.00, true, true),
  ('SRV00012', 'SERVIÇO DE SINALIZAÇÃO VIÁRIA HORIZONTAL MANUTENÇÃO', 'SERVIÇO DE SINALIZAÇÃO VIÁRIA HORIZONTAL MANUTENÇÃO', 'SINALIZAÇÃO HORIZONTAL', '7.05', '70502', 0.00, false, true),
  ('SRV00013', 'SERVIÇO DIÁRIA EQUIPE SINALIZAÇÃO OBRAS', 'SERVIÇO DIÁRIA EQUIPE SINALIZAÇÃO OBRAS', 'SERVIÇO LOCAÇÃO DE EQUIPE', '7.05', '70502', 0.00, false, true)
on conflict (codigo) do nothing;
