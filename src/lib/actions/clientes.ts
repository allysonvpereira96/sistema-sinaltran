"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { onlyDigits, isValidCnpj } from "@/lib/cnpj";
import { CLIENTES as MOCK_CLIENTES } from "@/lib/mocks/cadastros";
import type { ClienteRow, CnpjLookupResult } from "@/lib/types/cliente";

/**
 * Busca clientes por nome / razão social / nome fantasia / CNPJ.
 * - Funciona com Supabase (produção)
 * - Fallback para mocks quando NEXT_PUBLIC_SUPABASE_URL não está setado
 */
export async function searchClientes(
  query: string,
  limit = 12,
): Promise<ClienteRow[]> {
  const q = (query ?? "").trim();
  if (q.length < 2) return [];

  // -- Fallback dev: usa mocks
  if (!hasSupabase()) {
    const lower = q.toLowerCase();
    const digits = onlyDigits(q);
    return MOCK_CLIENTES.filter((c) => {
      if (c.razao_social.toLowerCase().includes(lower)) return true;
      if (c.nome_fantasia?.toLowerCase().includes(lower)) return true;
      if (digits && c.cnpj_cpf && c.cnpj_cpf.includes(digits)) return true;
      return false;
    })
      .slice(0, limit)
      .map(
        (c) =>
          ({
            id: c.id,
            razao_social: c.razao_social,
            nome_fantasia: c.nome_fantasia,
            cnpj_cpf: c.cnpj_cpf,
            tipo_pessoa: c.tipo_pessoa,
            email: null,
            telefone: c.telefone,
            responsavel: c.responsavel,
            endereco: null,
            cidade: c.cidade,
            estado: c.estado,
            cep: null,
            observacoes: null,
            ativo: c.ativo,
            created_at: "",
            updated_at: "",
          }) satisfies ClienteRow,
      );
  }

  const supabase = await createClient();
  const digits = onlyDigits(q);

  // Se a busca parece um CNPJ/CPF (>= 6 dígitos contínuos), faz por documento
  if (digits.length >= 6) {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .ilike("cnpj_cpf", `%${digits}%`)
      .limit(limit);
    if (error) {
      console.error("[searchClientes] erro cnpj:", error.message);
      return [];
    }
    return (data ?? []) as ClienteRow[];
  }

  // Busca por nome (razão social OR nome fantasia)
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .or(`razao_social.ilike.%${q}%,nome_fantasia.ilike.%${q}%`)
    .order("razao_social", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[searchClientes] erro nome:", error.message);
    return [];
  }
  return (data ?? []) as ClienteRow[];
}

/**
 * Lista todos os clientes para a tela de cadastro.
 * - Supabase (produção): pagina em blocos de 1000 (limite do PostgREST) até
 *   esgotar, ordenado por razão social.
 * - Fallback dev: devolve os mocks mapeados para o formato `ClienteRow`.
 */
export async function listClientes(): Promise<ClienteRow[]> {
  if (!hasSupabase()) {
    return MOCK_CLIENTES.map((c) => ({
      id: c.id,
      razao_social: c.razao_social,
      nome_fantasia: c.nome_fantasia,
      cnpj_cpf: c.cnpj_cpf,
      tipo_pessoa: c.tipo_pessoa,
      email: null,
      telefone: c.telefone,
      responsavel: c.responsavel,
      endereco: null,
      cidade: c.cidade,
      estado: c.estado,
      cep: null,
      observacoes: null,
      ativo: c.ativo,
      created_at: "",
      updated_at: "",
    }));
  }

  const supabase = await createClient();
  const PAGE = 1000;
  const all: ClienteRow[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("razao_social", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("[listClientes]", error.message);
      break;
    }
    const rows = (data ?? []) as ClienteRow[];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }

  return all;
}

/**
 * Busca um cliente por ID (para exibir o selecionado).
 */
export async function getClienteById(
  id: string,
): Promise<ClienteRow | null> {
  if (!id) return null;

  if (!hasSupabase()) {
    const c = MOCK_CLIENTES.find((x) => x.id === id);
    if (!c) return null;
    return {
      id: c.id,
      razao_social: c.razao_social,
      nome_fantasia: c.nome_fantasia,
      cnpj_cpf: c.cnpj_cpf,
      tipo_pessoa: c.tipo_pessoa,
      email: null,
      telefone: c.telefone,
      responsavel: c.responsavel,
      endereco: null,
      cidade: c.cidade,
      estado: c.estado,
      cep: null,
      observacoes: null,
      ativo: c.ativo,
      created_at: "",
      updated_at: "",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[getClienteById]", error.message);
    return null;
  }
  return data as ClienteRow | null;
}

/**
 * Busca cliente por CNPJ exato (digit-only).
 */
export async function getClienteByCnpj(
  cnpj: string,
): Promise<ClienteRow | null> {
  const digits = onlyDigits(cnpj);
  if (!digits) return null;

  if (!hasSupabase()) {
    const c = MOCK_CLIENTES.find((x) => x.cnpj_cpf === digits);
    if (!c) return null;
    return getClienteById(c.id);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("cnpj_cpf", digits)
    .maybeSingle();
  if (error) {
    console.error("[getClienteByCnpj]", error.message);
    return null;
  }
  return data as ClienteRow | null;
}

/**
 * Consulta CNPJ na BrasilAPI (camada gratuita, sem auth, com cache CDN).
 * Endpoint: https://brasilapi.com.br/api/cnpj/v1/{cnpj}
 *
 * Retorna null se: CNPJ inválido, não encontrado ou erro de rede.
 */
export async function lookupCnpj(
  cnpj: string,
): Promise<CnpjLookupResult | null> {
  const digits = onlyDigits(cnpj);
  if (!isValidCnpj(digits)) return null;

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      // BrasilAPI cacheia bem; mantemos cache leve no nosso server
      next: { revalidate: 60 * 60 * 24 }, // 24h
    });
    if (!res.ok) return null;
    const j = (await res.json()) as Record<string, unknown>;

    const get = (k: string) =>
      j[k] != null ? String(j[k]).trim() || null : null;

    const enderecoParts = [
      get("descricao_tipo_de_logradouro"),
      get("logradouro"),
      get("numero"),
      get("complemento"),
      get("bairro"),
    ]
      .filter(Boolean)
      .join(", ");

    return {
      cnpj: digits,
      razao_social:
        get("razao_social") || get("nome_fantasia") || `CNPJ ${digits}`,
      nome_fantasia: get("nome_fantasia"),
      email: get("email"),
      telefone:
        get("ddd_telefone_1") ||
        get("ddd_telefone_2") ||
        null,
      endereco: enderecoParts || null,
      cidade: get("municipio"),
      estado: get("uf"),
      cep: get("cep")?.replace(/\D/g, "") || null,
      situacao: get("descricao_situacao_cadastral"),
      data_situacao: get("data_situacao_cadastral"),
    };
  } catch (err) {
    console.error("[lookupCnpj]", (err as Error).message);
    return null;
  }
}

/**
 * Cria um novo cliente (a partir de CNPJ lookup ou cadastro manual).
 * Retorna o cliente persistido (ou null em erro).
 */
export async function createCliente(input: {
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj_cpf?: string | null;
  tipo_pessoa?: "juridica" | "fisica" | "publico";
  email?: string | null;
  telefone?: string | null;
  responsavel?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  observacoes?: string | null;
}): Promise<{ ok: true; cliente: ClienteRow } | { ok: false; error: string }> {
  if (!input.razao_social?.trim()) {
    return { ok: false, error: "Razão social é obrigatória." };
  }

  const cnpjDigits = onlyDigits(input.cnpj_cpf ?? "");
  const tipo =
    input.tipo_pessoa ??
    (cnpjDigits.length === 11 ? "fisica" : "juridica");

  // -- Fallback dev: insere no array de mocks (in-memory; vai se perder)
  if (!hasSupabase()) {
    const novoId = `c-${Date.now().toString(36)}`;
    const novo: ClienteRow = {
      id: novoId,
      razao_social: input.razao_social.trim(),
      nome_fantasia: input.nome_fantasia ?? null,
      cnpj_cpf: cnpjDigits || null,
      tipo_pessoa: tipo,
      email: input.email ?? null,
      telefone: input.telefone ?? null,
      responsavel: input.responsavel ?? null,
      endereco: input.endereco ?? null,
      cidade: input.cidade ?? null,
      estado: input.estado ?? null,
      cep: input.cep ?? null,
      observacoes: input.observacoes ?? null,
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_CLIENTES.push({
      id: novo.id,
      razao_social: novo.razao_social,
      nome_fantasia: novo.nome_fantasia,
      cnpj_cpf: novo.cnpj_cpf,
      tipo_pessoa: novo.tipo_pessoa,
      cidade: novo.cidade,
      estado: novo.estado,
      responsavel: novo.responsavel,
      telefone: novo.telefone,
      ativo: true,
    });
    return { ok: true, cliente: novo };
  }

  const supabase = await createClient();

  // Se CNPJ informado e já existir, devolve o existente (não duplica)
  if (cnpjDigits) {
    const existente = await getClienteByCnpj(cnpjDigits);
    if (existente) return { ok: true, cliente: existente };
  }

  const { data, error } = await supabase
    .from("clientes")
    .insert({
      razao_social: input.razao_social.trim(),
      nome_fantasia: input.nome_fantasia ?? null,
      cnpj_cpf: cnpjDigits || null,
      tipo_pessoa: tipo,
      email: input.email ?? null,
      telefone: input.telefone ?? null,
      responsavel: input.responsavel ?? null,
      endereco: input.endereco ?? null,
      cidade: input.cidade ?? null,
      estado: input.estado ?? null,
      cep: input.cep ?? null,
      observacoes: input.observacoes ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[createCliente]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath("/cadastros/clientes");
  return { ok: true, cliente: data as ClienteRow };
}

/**
 * Atualiza um cliente existente.
 */
export async function updateCliente(
  id: string,
  input: {
    razao_social: string;
    nome_fantasia?: string | null;
    cnpj_cpf?: string | null;
    tipo_pessoa?: "juridica" | "fisica" | "publico";
    email?: string | null;
    telefone?: string | null;
    responsavel?: string | null;
    endereco?: string | null;
    cidade?: string | null;
    estado?: string | null;
    cep?: string | null;
    observacoes?: string | null;
    ativo?: boolean;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.razao_social?.trim()) {
    return { ok: false, error: "Razão social é obrigatória." };
  }
  if (!hasSupabase()) return { ok: true };

  const cnpjDigits = onlyDigits(input.cnpj_cpf ?? "");

  // Evita colidir o CNPJ com outro cliente.
  if (cnpjDigits) {
    const existente = await getClienteByCnpj(cnpjDigits);
    if (existente && existente.id !== id) {
      return { ok: false, error: "Outro cliente já usa este CNPJ/CPF." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .update({
      razao_social: input.razao_social.trim(),
      nome_fantasia: input.nome_fantasia || null,
      cnpj_cpf: cnpjDigits || null,
      tipo_pessoa:
        input.tipo_pessoa ?? (cnpjDigits.length === 11 ? "fisica" : "juridica"),
      email: input.email || null,
      telefone: input.telefone || null,
      responsavel: input.responsavel || null,
      endereco: input.endereco || null,
      cidade: input.cidade || null,
      estado: input.estado || null,
      cep: input.cep || null,
      observacoes: input.observacoes || null,
      ...(input.ativo === undefined ? {} : { ativo: input.ativo }),
    })
    .eq("id", id);

  if (error) {
    console.error("[updateCliente]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath("/cadastros/clientes");
  revalidatePath(`/cadastros/clientes/${id}/editar`);
  return { ok: true };
}

/**
 * Inativa / reativa um cliente (soft delete — preserva histórico de obras).
 */
export async function setClienteAtivo(
  id: string,
  ativo: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("clientes").update({ ativo }).eq("id", id);
  if (error) {
    console.error("[setClienteAtivo]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath("/cadastros/clientes");
  return { ok: true };
}
