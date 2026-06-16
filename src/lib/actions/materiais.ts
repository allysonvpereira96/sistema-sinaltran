"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { MATERIAIS as MOCK_MATERIAIS } from "@/lib/mocks/cadastros";
import type { MaterialCategoria, MaterialRow } from "@/lib/types/material";

const TABLE = "materiais";
const BASE_PATH = "/cadastros/materiais";

export type MaterialInput = {
  codigo?: string | null;
  descricao: string;
  categoria?: MaterialCategoria;
  familia?: string | null;
  ncm?: string | null;
  classificacao?: string | null;
  unidade_medida?: string | null;
  unidade_fornecedor?: string | null;
  peso?: string | null;
  fornecedores?: string | null;
  valor_referencia?: number | null;
  valor_mao_obra?: number | null;
  estoque_minimo?: number | null;
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

export async function listMateriais(): Promise<MaterialRow[]> {
  if (!hasSupabase()) {
    return MOCK_MATERIAIS.map((m) => ({
      id: m.id,
      codigo: m.codigo,
      descricao: m.descricao,
      categoria: m.categoria,
      familia: null,
      ncm: null,
      classificacao: null,
      unidade_medida: m.unidade_medida,
      unidade_fornecedor: null,
      peso: null,
      fornecedores: null,
      valor_referencia: m.valor_referencia,
      valor_mao_obra: 0,
      estoque_minimo: m.estoque_minimo,
      observacoes: null,
      ativo: m.ativo,
      created_at: "",
      updated_at: "",
    }));
  }

  const supabase = await createClient();
  const PAGE = 1000;
  const all: MaterialRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("descricao", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("[listMateriais]", error.message);
      break;
    }
    const rows = (data ?? []) as MaterialRow[];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

export async function getMaterialById(id: string): Promise<MaterialRow | null> {
  if (!id || !hasSupabase()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[getMaterialById]", error.message);
    return null;
  }
  return data as MaterialRow | null;
}

/** Próximo código sequencial PRDNNNNN (sugestão para cadastro manual). */
async function proximoCodigo(): Promise<string> {
  if (!hasSupabase()) return "PRD00001";
  const supabase = await createClient();
  const { data } = await supabase
    .from(TABLE)
    .select("codigo")
    .like("codigo", "PRD%")
    .order("codigo", { ascending: false })
    .limit(1);
  const ultimo = (data?.[0] as { codigo: string } | undefined)?.codigo;
  const n = ultimo ? Number(ultimo.replace(/\D/g, "")) : 0;
  return `PRD${String((Number.isFinite(n) ? n : 0) + 1).padStart(5, "0")}`;
}

export async function sugerirCodigoMaterial(): Promise<string> {
  return proximoCodigo();
}

function payload(input: MaterialInput) {
  return clean({
    descricao: input.descricao.trim(),
    categoria: input.categoria ?? "outro",
    familia: input.familia ?? null,
    ncm: input.ncm ?? null,
    classificacao: input.classificacao ?? null,
    unidade_medida: input.unidade_medida || "UN",
    unidade_fornecedor: input.unidade_fornecedor ?? null,
    peso: input.peso ?? null,
    fornecedores: input.fornecedores ?? null,
    valor_referencia: input.valor_referencia ?? 0,
    valor_mao_obra: input.valor_mao_obra ?? 0,
    estoque_minimo: input.estoque_minimo ?? 0,
    observacoes: input.observacoes ?? null,
    ...(input.ativo === undefined ? {} : { ativo: input.ativo }),
  });
}

export async function createMaterial(
  input: MaterialInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!input.descricao?.trim()) {
    return { ok: false, error: "Descrição é obrigatória." };
  }
  if (!hasSupabase()) return { ok: true, id: `mat-${Date.now().toString(36)}` };

  const supabase = await createClient();
  const codigo = input.codigo?.trim() || (await proximoCodigo());

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...payload(input), codigo })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Já existe um material com este código." };
    }
    console.error("[createMaterial]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  return { ok: true, id: (data as { id: string }).id };
}

export async function updateMaterial(
  id: string,
  input: MaterialInput,
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
      return { ok: false, error: "Já existe um material com este código." };
    }
    console.error("[updateMaterial]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  revalidatePath(`${BASE_PATH}/${id}/editar`);
  return { ok: true };
}

export async function setMaterialAtivo(
  id: string,
  ativo: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update({ ativo }).eq("id", id);
  if (error) {
    console.error("[setMaterialAtivo]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  return { ok: true };
}
