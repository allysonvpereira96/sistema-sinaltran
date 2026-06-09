-- ============================================================================
-- Sinaltran · Migration inicial — tipos, helpers e autenticação
-- ============================================================================

-- Roles de aplicação
create type public.app_role as enum ('admin', 'user');

-- Status de orçamento
create type public.orcamento_status as enum (
  'rascunho',
  'enviado',
  'aprovado',
  'rejeitado',
  'perdido'
);

-- Status de obra
create type public.obra_status as enum (
  'planejamento',
  'em_andamento',
  'pausada',
  'concluida',
  'cancelada'
);

-- Status de medição
create type public.medicao_status as enum (
  'rascunho',
  'enviada',
  'aprovada',
  'rejeitada'
);

-- Profiles (estende auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text not null,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Helper: papel do usuário
create or replace function public.get_user_role(user_uuid uuid)
returns app_role
language sql
security definer
stable
as $$
  select role from public.profiles where id = user_uuid;
$$;

-- Helper: é admin?
create or replace function public.is_admin(user_uuid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = user_uuid and role = 'admin'
  );
$$;

-- Trigger genérico para updated_at
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- RLS profiles
create policy "Profiles: usuário vê o próprio"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles: usuário atualiza o próprio"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Profiles: admin vê todos"
  on public.profiles for select
  using (public.is_admin(auth.uid()));

create policy "Profiles: admin gerencia todos"
  on public.profiles for all
  using (public.is_admin(auth.uid()));

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- Auto-criação de profile no signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, nome, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nome', new.email),
    'user'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
