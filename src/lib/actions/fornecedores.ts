"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { onlyDigits } from "@/lib/cnpj";
import { FORNECEDORES as MOCK_FORNECEDORES } from "@/lib/mocks/cadastros";
import type { FornecedorRow } from "@/lib/types/fornecedor";

const TABLE = "fornecedores";
const BASE_PATH = "/cadastros/fornecedores";

export type FornecedorInput = {
  nome: string;
  nome_fantasia?: string | null;
  cnpj_cpf?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
};

/** Normaliza strings vazias para null antes de persistir. */
function clean<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === "") (out as Record<string, unknown>)[k] = null;
  }
  return out;
}

/**
 * Lista todos os fornecedores para a tela de cadastro.
 * - Supabase (produção): pagina em blocos de 1000 (limite do PostgREST) até
 *   esgotar, ordenado por nome.
 * - Fallback dev: devolve os mocks mapeados para o formato `FornecedorRow`.
 */
export async function listFornecedores(): Promise<FornecedorRow[]> {
  if (!hasSupabase()) {
    return MOCK_FORNECEDORES.map((f) => ({
      id: f.id,
      nome: f.nome,
      nome_fantasia: f.nome_fantasia,
      cnpj_cpf: f.cnpj_cpf,
      telefone: f.telefone,
      email: f.email,
      endereco: null,
      cidade: f.cidade,
      estado: f.estado,
      cep: null,
      observacoes: null,
      ativo: f.ativo,
      created_at: "",
      updated_at: "",
    }));
  }

  const supabase = await createClient();
  const PAGE = 1000;
  const all: FornecedorRow[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("nome", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("[listFornecedores]", error.message);
      break;
    }
    const rows = (data ?? []) as FornecedorRow[];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }

  return all;
}

/** Busca um fornecedor por ID (para a tela de edição). */
export async function getFornecedorById(id: string): Promise<FornecedorRow | null> {
  if (!id) return null;
  if (!hasSupabase()) {
    return (MOCK_FORNECEDORES.find((f) => f.id === id) as FornecedorRow) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[getFornecedorById]", error.message);
    return null;
  }
  return data as FornecedorRow | null;
}

/** Busca fornecedor por CNPJ/CPF exato (digit-only) — usado para não duplicar. */
export async function getFornecedorByCnpj(
  cnpj: string,
): Promise<FornecedorRow | null> {
  const digits = onlyDigits(cnpj);
  if (!digits) return null;
  if (!hasSupabase()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("cnpj_cpf", digits)
    .maybeSingle();
  if (error) {
    console.error("[getFornecedorByCnpj]", error.message);
    return null;
  }
  return data as FornecedorRow | null;
}

export async function createFornecedor(
  input: FornecedorInput,
): Promise<{ ok: true; fornecedor: FornecedorRow } | { ok: false; error: string }> {
  if (!input.nome?.trim()) {
    return { ok: false, error: "Nome / razão social é obrigatório." };
  }

  const cnpjDigits = onlyDigits(input.cnpj_cpf ?? "");

  const payload = clean({
    nome: input.nome.trim(),
    nome_fantasia: input.nome_fantasia ?? null,
    cnpj_cpf: cnpjDigits || null,
    telefone: input.telefone ?? null,
    email: input.email ?? null,
    endereco: input.endereco ?? null,
    cidade: input.cidade ?? null,
    estado: input.estado ?? null,
    cep: input.cep ?? null,
    observacoes: input.observacoes ?? null,
    ativo: input.ativo ?? true,
  });

  if (!hasSupabase()) {
    return {
      ok: true,
      fornecedor: {
        id: `f-${Date.now().toString(36)}`,
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as FornecedorRow,
    };
  }

  const supabase = await createClient();

  // Se CNPJ informado e já existir, devolve o existente (não duplica).
  if (cnpjDigits) {
    const existente = await getFornecedorByCnpj(cnpjDigits);
    if (existente) {
      return { ok: false, error: "Já existe um fornecedor com este CNPJ/CPF." };
    }
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    console.error("[createFornecedor]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  return { ok: true, fornecedor: data as FornecedorRow };
}

export async function updateFornecedor(
  id: string,
  input: FornecedorInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.nome?.trim()) {
    return { ok: false, error: "Nome / razão social é obrigatório." };
  }
  if (!hasSupabase()) return { ok: true };

  const cnpjDigits = onlyDigits(input.cnpj_cpf ?? "");

  // Evita colidir o CNPJ com outro fornecedor.
  if (cnpjDigits) {
    const existente = await getFornecedorByCnpj(cnpjDigits);
    if (existente && existente.id !== id) {
      return { ok: false, error: "Outro fornecedor já usa este CNPJ/CPF." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    .update(
      clean({
        nome: input.nome.trim(),
        nome_fantasia: input.nome_fantasia ?? null,
        cnpj_cpf: cnpjDigits || null,
        telefone: input.telefone ?? null,
        email: input.email ?? null,
        endereco: input.endereco ?? null,
        cidade: input.cidade ?? null,
        estado: input.estado ?? null,
        cep: input.cep ?? null,
        observacoes: input.observacoes ?? null,
        ...(input.ativo === undefined ? {} : { ativo: input.ativo }),
      }),
    )
    .eq("id", id);
  if (error) {
    console.error("[updateFornecedor]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  revalidatePath(`${BASE_PATH}/${id}/editar`);
  return { ok: true };
}

/** Inativa / reativa um fornecedor (soft delete — preserva histórico de compras). */
export async function setFornecedorAtivo(
  id: string,
  ativo: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update({ ativo }).eq("id", id);
  if (error) {
    console.error("[setFornecedorAtivo]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  return { ok: true };
}
