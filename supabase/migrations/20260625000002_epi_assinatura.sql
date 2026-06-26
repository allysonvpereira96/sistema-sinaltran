-- ============================================================================
-- Sinaltran · EPI — assinatura por QR Code (interna, sem D4Sign/biometria)
--   O colaborador escaneia um QR, abre uma página pública e assina no celular.
--   Acesso anônimo via RPCs SECURITY DEFINER por token (sem abrir RLS).
-- ============================================================================

alter table public.epi_entregas add column if not exists assinatura_token uuid;
alter table public.epi_entregas add column if not exists assinado boolean not null default false;
alter table public.epi_entregas add column if not exists data_assinatura timestamptz;
alter table public.epi_entregas add column if not exists assinatura_url text;

create index if not exists epi_entregas_token_idx on public.epi_entregas (assinatura_token);

-- ── RPC: dados da entrega para a página pública de assinatura ─────────────────
create or replace function public.get_entrega_assinatura(p_token uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'colaborador', (
      select jsonb_build_object('nome', c.nome_completo, 'funcao', c.cargo, 'admissao', c.data_admissao)
      from public.epi_entregas e
      join public.colaboradores c on c.id = e.colaborador_id
      where e.assinatura_token = p_token
      limit 1
    ),
    'assinado', coalesce((select bool_or(e.assinado) from public.epi_entregas e where e.assinatura_token = p_token), false),
    'data_entrega', (select min(e.data_entrega) from public.epi_entregas e where e.assinatura_token = p_token),
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object('nome', cat.nome, 'quantidade', e.quantidade, 'ca', cat.numero_ca) order by cat.nome)
      from public.epi_entregas e
      join public.epi_catalogo cat on cat.id = e.catalogo_id
      where e.assinatura_token = p_token
    ), '[]'::jsonb)
  );
$$;

-- ── RPC: grava a assinatura em todas as linhas do lote (token) ───────────────
create or replace function public.submit_epi_assinatura(p_token uuid, p_url text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  update public.epi_entregas
     set assinado = true, data_assinatura = now(), assinatura_url = p_url
   where assinatura_token = p_token and assinado = false;
  get diagnostics n = row_count;
  return n > 0;
end $$;

grant execute on function public.get_entrega_assinatura(uuid) to anon, authenticated;
grant execute on function public.submit_epi_assinatura(uuid, text) to anon, authenticated;

-- ── Storage: bucket público para as assinaturas (path inclui o token) ────────
insert into storage.buckets (id, name, public)
values ('assinaturas-epi', 'assinaturas-epi', true)
on conflict (id) do nothing;

drop policy if exists "assinaturas-epi: insere" on storage.objects;
drop policy if exists "assinaturas-epi: lê" on storage.objects;
create policy "assinaturas-epi: insere" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'assinaturas-epi');
create policy "assinaturas-epi: lê" on storage.objects
  for select to anon, authenticated using (bucket_id = 'assinaturas-epi');
