"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

const EMPRESA_COOKIE = "empresa_id";
const UM_ANO = 60 * 60 * 24 * 365;

export type Empresa = {
  id: string;
  nome: string;
  razao_social: string;
};

/** Dados completos de uma empresa para o cabeçalho do PDF (por nome). */
export type EmpresaPdf = {
  id: string;
  nome: string;
  razao_social: string;
  cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  telefone: string | null;
  email: string | null;
};

export async function getEmpresaParaPdf(nome: string): Promise<EmpresaPdf | null> {
  if (!hasSupabase()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empresas")
    .select("id, nome, razao_social, cnpj, endereco, cidade, estado, telefone, email")
    .ilike("nome", nome)
    .eq("ativa", true)
    .maybeSingle();
  if (error) {
    console.error("[getEmpresaParaPdf]", error.message);
    return null;
  }
  return (data as EmpresaPdf) ?? null;
}

/** Empresas ativas (Sinaltran / Sinalshop), ordenadas com a Sinaltran primeiro. */
export async function listEmpresas(): Promise<Empresa[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empresas")
    .select("id, nome, razao_social")
    .eq("ativa", true)
    .order("nome", { ascending: true });
  if (error) {
    console.error("[listEmpresas]", error.message);
    return [];
  }
  const lista = (data ?? []) as Empresa[];
  // Sinaltran sempre primeiro (é a empresa principal/padrão)
  return lista.sort((a, b) => {
    if (a.nome === "Sinaltran") return -1;
    if (b.nome === "Sinaltran") return 1;
    return a.nome.localeCompare(b.nome);
  });
}

/**
 * Empresa ativa do contexto (cookie `empresa_id`). Faz fallback para a Sinaltran
 * (ou a 1ª ativa) quando o cookie está ausente/ inválido.
 */
export async function getEmpresaAtiva(): Promise<Empresa | null> {
  const empresas = await listEmpresas();
  if (empresas.length === 0) return null;
  const cookieStore = await cookies();
  const id = cookieStore.get(EMPRESA_COOKIE)?.value;
  return empresas.find((e) => e.id === id) ?? empresas[0];
}

/** Só o id da empresa ativa (atalho para escopar consultas). */
export async function getEmpresaAtivaId(): Promise<string | null> {
  const empresa = await getEmpresaAtiva();
  return empresa?.id ?? null;
}

/** Troca a empresa ativa (grava o cookie e revalida o layout). */
export async function setEmpresaAtivaAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "Empresa inválida." };
  const cookieStore = await cookies();
  cookieStore.set(EMPRESA_COOKIE, id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: UM_ANO,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
