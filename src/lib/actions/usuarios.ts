"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { hasSupabase } from "@/lib/supabase/env";
import { MODULOS } from "@/config/navigation";
import type {
  AppRole,
  CurrentProfile,
  ModuloKey,
  UsuarioRow,
} from "@/lib/types/usuario";

const USUARIOS_PATH = "/configuracoes/usuarios";
const MODULO_KEYS = new Set<ModuloKey>(MODULOS.map((m) => m.key));

/** Mantém apenas keys de módulo válidas e remove duplicatas. */
function sanitizeModulos(modulos: string[] | null | undefined): ModuloKey[] {
  if (!modulos) return [];
  const out: ModuloKey[] = [];
  for (const m of modulos) {
    if (MODULO_KEYS.has(m as ModuloKey) && !out.includes(m as ModuloKey)) {
      out.push(m as ModuloKey);
    }
  }
  return out;
}

/**
 * Profile do usuário logado (role + módulos). Usado pelo layout/sidebar e como
 * guarda de autorização nas demais actions. Retorna null se deslogado.
 * Em modo demo (sem Supabase), devolve um admin fictício para liberar o shell.
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  if (!hasSupabase()) {
    return {
      id: "demo",
      email: "demo@sinaltran.com",
      nome: "Demonstração",
      role: "admin",
      modulos: MODULOS.map((m) => m.key),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, nome, role, modulos")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    console.error("[getCurrentProfile]", error?.message);
    // Sem profile: trata como usuário sem módulos (apenas Dashboard).
    return {
      id: user.id,
      email: user.email ?? "",
      nome: user.email ?? "Usuário",
      role: "user",
      modulos: [],
    };
  }

  return {
    id: data.id,
    email: data.email,
    nome: data.nome,
    role: data.role as AppRole,
    modulos: sanitizeModulos(data.modulos),
  };
}

/** Garante que o chamador é master (admin). Lança em caso contrário. */
async function assertAdmin(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Acesso restrito a usuários master.");
  }
  return profile;
}

/**
 * Lista todos os usuários (profiles). O admin lê todos via RLS
 * ("Profiles: admin vê todos"). O status ativo/inativo vem do `banned_until`
 * da Admin API (quando a service key está disponível).
 */
export async function listUsuarios(): Promise<UsuarioRow[]> {
  if (!hasSupabase()) {
    return [
      {
        id: "demo",
        email: "demo@sinaltran.com",
        nome: "Demonstração",
        role: "admin",
        modulos: MODULOS.map((m) => m.key),
        ativo: true,
        created_at: new Date().toISOString(),
      },
    ];
  }

  await assertAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, nome, role, modulos, created_at")
    .order("nome", { ascending: true });

  if (error) {
    console.error("[listUsuarios]", error.message);
    return [];
  }

  // Mapa de banimento (status) — best effort, só com service key.
  const banidos = new Set<string>();
  if (hasAdminKey()) {
    try {
      const admin = createAdminClient();
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const now = Date.now();
      for (const u of list?.users ?? []) {
        const until = (u as { banned_until?: string | null }).banned_until;
        if (until && new Date(until).getTime() > now) banidos.add(u.id);
      }
    } catch (err) {
      console.error("[listUsuarios] status", (err as Error).message);
    }
  }

  return (data ?? []).map((d) => ({
    id: d.id,
    email: d.email,
    nome: d.nome,
    role: d.role as AppRole,
    modulos: sanitizeModulos(d.modulos),
    ativo: !banidos.has(d.id),
    created_at: d.created_at,
  }));
}

/**
 * Cria um novo usuário (login + profile) com senha temporária definida pelo
 * master. O trigger `handle_new_user` cria o profile no insert do auth.users;
 * em seguida gravamos nome/role/modulos.
 */
export async function createUsuario(input: {
  email: string;
  nome: string;
  password: string;
  role: AppRole;
  modulos: ModuloKey[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const email = input.email?.trim().toLowerCase();
  const nome = input.nome?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Informe um e-mail válido." };
  }
  if (!nome) return { ok: false, error: "Informe o nome do usuário." };
  if (!input.password || input.password.length < 8) {
    return { ok: false, error: "A senha deve ter ao menos 8 caracteres." };
  }

  try {
    await assertAdmin();
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  if (!hasAdminKey()) {
    return {
      ok: false,
      error:
        "Service role key do Supabase indisponível — não é possível criar logins neste ambiente.",
    };
  }

  // role master sempre tem todos os módulos (a coluna fica irrelevante p/ admin).
  const modulos = input.role === "admin" ? [] : sanitizeModulos(input.modulos);

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { nome },
  });

  if (error || !data.user) {
    console.error("[createUsuario]", error?.message);
    return { ok: false, error: error?.message ?? "Falha ao criar o usuário." };
  }

  // O trigger já criou o profile; atualizamos nome/role/modulos.
  const { error: upErr } = await admin
    .from("profiles")
    .update({ nome, role: input.role, modulos })
    .eq("id", data.user.id);

  if (upErr) {
    console.error("[createUsuario] profile", upErr.message);
    return { ok: false, error: upErr.message };
  }

  revalidatePath(USUARIOS_PATH);
  return { ok: true, id: data.user.id };
}

/**
 * Atualiza nome, papel e módulos de um usuário existente.
 */
export async function updateUsuario(
  id: string,
  input: { nome: string; role: AppRole; modulos: ModuloKey[] },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const nome = input.nome?.trim();
  if (!nome) return { ok: false, error: "Informe o nome do usuário." };

  let me: CurrentProfile;
  try {
    me = await assertAdmin();
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  // Trava de segurança: o master não pode rebaixar a si mesmo (evita ficar sem
  // nenhum admin por engano numa sessão).
  if (id === me.id && input.role !== "admin") {
    return { ok: false, error: "Você não pode remover seu próprio acesso master." };
  }

  const modulos = input.role === "admin" ? [] : sanitizeModulos(input.modulos);

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ nome, role: input.role, modulos })
    .eq("id", id);

  if (error) {
    console.error("[updateUsuario]", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath(USUARIOS_PATH);
  return { ok: true };
}

/**
 * Redefine a senha de um usuário (master define a nova senha temporária).
 */
export async function resetSenha(
  id: string,
  novaSenha: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!novaSenha || novaSenha.length < 8) {
    return { ok: false, error: "A senha deve ter ao menos 8 caracteres." };
  }

  try {
    await assertAdmin();
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  if (!hasAdminKey()) {
    return { ok: false, error: "Service role key indisponível neste ambiente." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, {
    password: novaSenha,
  });
  if (error) {
    console.error("[resetSenha]", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Ativa / inativa o login do usuário via banimento (ban_duration). Inativo =
 * banido por ~100 anos; ativar = remove o banimento.
 */
export async function setUsuarioAtivo(
  id: string,
  ativo: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let me: CurrentProfile;
  try {
    me = await assertAdmin();
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  if (id === me.id && !ativo) {
    return { ok: false, error: "Você não pode inativar a si mesmo." };
  }
  if (!hasAdminKey()) {
    return { ok: false, error: "Service role key indisponível neste ambiente." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, {
    ban_duration: ativo ? "none" : "876000h",
  });
  if (error) {
    console.error("[setUsuarioAtivo]", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath(USUARIOS_PATH);
  return { ok: true };
}
