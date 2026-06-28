"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import type { ServicoRow } from "@/lib/types/servico";

const TABLE = "servicos";
const BASE_PATH = "/cadastros/servicos";

export type ServicoInput = {
  codigo?: string | null;
  descricao: string;
  descricao_completa?: string | null;
  categoria?: string | null;
  codigo_lc116?: string | null;
  codigo_municipio?: string | null;
  unidade_padrao?: string | null;
  preco_unitario?: number | null;
  aliquota_iss?: number | null;
  retem_iss?: boolean;
  observacoes?: string | null;
  ativo?: boolean;
};

function clean<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === "") (out as Record<string, unknown>)[k] = null;
  }
  return out;
}

export type ServicoResumo = {
  id: string;
  codigo: string;
  descricao: string;
  descricao_completa: string | null;
  unidade_padrao: string | null;
  preco_unitario: number;
};

/** Serviços ativos (campos essenciais) para o seletor de itens do orçamento. */
export async function listServicosResumo(): Promise<ServicoResumo[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, codigo, descricao, descricao_completa, unidade_padrao, preco_unitario")
    .eq("ativo", true)
    .order("codigo", { ascending: true });
  if (error) {
    console.error("[listServicosResumo]", error.message);
    return [];
  }
  return (data ?? []) as ServicoResumo[];
}

/** Dados fiscais do serviço (espelham o cadastro do Omie) p/ o export de O.S. */
export type ServicoFiscal = {
  id: string;
  codigo: string;
  descricao: string;
  categoria: string | null;
  codigo_municipio: string | null;
  codigo_lc116: string | null;
  codigo_nbs: string | null;
  aliquota_iss: number;
  retem_iss: boolean;
  aliquota_inss: number;
  retem_inss: boolean;
  tributacao: string | null;
};

export async function listServicosFiscais(): Promise<ServicoFiscal[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      "id, codigo, descricao, categoria, codigo_municipio, codigo_lc116, codigo_nbs, aliquota_iss, retem_iss, aliquota_inss, retem_inss, tributacao",
    )
    .eq("ativo", true);
  if (error) {
    console.error("[listServicosFiscais]", error.message);
    return [];
  }
  return (data ?? []).map((s) => {
    const r = s as ServicoFiscal;
    return { ...r, aliquota_iss: Number(r.aliquota_iss) || 0, aliquota_inss: Number(r.aliquota_inss) || 0 };
  });
}

export async function listServicos(): Promise<ServicoRow[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("codigo", { ascending: true });
  if (error) {
    console.error("[listServicos]", error.message);
    return [];
  }
  return (data ?? []) as ServicoRow[];
}

export async function getServicoById(id: string): Promise<ServicoRow | null> {
  if (!id || !hasSupabase()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[getServicoById]", error.message);
    return null;
  }
  return data as ServicoRow | null;
}

/** Próximo código sequencial SRVNNNNN (apenas sugestão para cadastro manual). */
async function proximoCodigo(): Promise<string> {
  if (!hasSupabase()) return "SRV00001";
  const supabase = await createClient();
  const { data } = await supabase
    .from(TABLE)
    .select("codigo")
    .like("codigo", "SRV%")
    .order("codigo", { ascending: false })
    .limit(1);
  const ultimo = (data?.[0] as { codigo: string } | undefined)?.codigo;
  const n = ultimo ? Number(ultimo.replace(/\D/g, "")) : 0;
  return `SRV${String((Number.isFinite(n) ? n : 0) + 1).padStart(5, "0")}`;
}

export async function sugerirCodigoServico(): Promise<string> {
  return proximoCodigo();
}

function payload(input: ServicoInput) {
  return clean({
    descricao: input.descricao.trim(),
    descricao_completa: input.descricao_completa ?? null,
    categoria: input.categoria ?? null,
    codigo_lc116: input.codigo_lc116 ?? null,
    codigo_municipio: input.codigo_municipio ?? null,
    unidade_padrao: input.unidade_padrao ?? null,
    preco_unitario: input.preco_unitario ?? 0,
    aliquota_iss: input.aliquota_iss ?? 0,
    retem_iss: input.retem_iss ?? false,
    observacoes: input.observacoes ?? null,
    ...(input.ativo === undefined ? {} : { ativo: input.ativo }),
  });
}

export async function createServico(
  input: ServicoInput,
): Promise<{ ok: true; id: string; codigo: string } | { ok: false; error: string }> {
  if (!input.descricao?.trim()) {
    return { ok: false, error: "Descrição é obrigatória." };
  }
  const codigoBase = input.codigo?.trim();
  if (!hasSupabase()) {
    return { ok: true, id: `srv-${Date.now().toString(36)}`, codigo: codigoBase || "—" };
  }

  const supabase = await createClient();
  const codigo = codigoBase || (await proximoCodigo());

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...payload(input), codigo })
    .select("id, codigo")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Já existe um serviço com este código." };
    }
    console.error("[createServico]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  const row = data as { id: string; codigo: string };
  return { ok: true, id: row.id, codigo: row.codigo };
}

export async function updateServico(
  id: string,
  input: ServicoInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.descricao?.trim()) {
    return { ok: false, error: "Descrição é obrigatória." };
  }
  if (!hasSupabase()) return { ok: true };

  const supabase = await createClient();
  const dados = {
    ...payload(input),
    ...(input.codigo?.trim() ? { codigo: input.codigo.trim() } : {}),
  };
  const { error } = await supabase.from(TABLE).update(dados).eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Já existe um serviço com este código." };
    }
    console.error("[updateServico]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  revalidatePath(`${BASE_PATH}/${id}/editar`);
  return { ok: true };
}

export async function setServicoAtivo(
  id: string,
  ativo: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update({ ativo }).eq("id", id);
  if (error) {
    console.error("[setServicoAtivo]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  return { ok: true };
}
