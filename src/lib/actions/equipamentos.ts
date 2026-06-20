"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { EQUIPAMENTOS as MOCK_EQUIPAMENTOS } from "@/lib/mocks/cadastros";
import type {
  EquipamentoRow,
  EquipamentoStatus,
  EquipamentoTipo,
} from "@/lib/types/equipamento";
import { normalizeSearch } from "@/lib/format";

const TABLE = "equipamentos";
const BASE_PATH = "/cadastros/equipamentos";

export type EquipamentoInput = {
  codigo?: string | null;
  descricao: string;
  tipo: EquipamentoTipo;
  placa?: string | null;
  marca?: string | null;
  modelo?: string | null;
  ano?: number | null;
  status: EquipamentoStatus;
  observacoes?: string | null;
};

function clean<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === "") (out as Record<string, unknown>)[k] = null;
  }
  return out;
}

/** Mapeia o mock antigo (sem alguns campos) para o formato `EquipamentoRow`. */
function mockToRow(e: (typeof MOCK_EQUIPAMENTOS)[number]): EquipamentoRow {
  return {
    id: e.id,
    codigo: e.codigo,
    descricao: e.descricao,
    tipo: e.tipo,
    placa: e.placa,
    marca: e.marca,
    modelo: e.modelo,
    ano: e.ano,
    status: e.status,
    ativo: e.ativo,
    observacoes: null,
    created_at: "",
    updated_at: "",
  };
}

export async function listEquipamentos(): Promise<EquipamentoRow[]> {
  if (!hasSupabase()) return MOCK_EQUIPAMENTOS.map(mockToRow);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("codigo", { ascending: true });
  if (error) {
    console.error("[listEquipamentos]", error.message);
    return [];
  }
  return (data ?? []) as EquipamentoRow[];
}

/** Busca veículos (tipo = veiculo) para o picker da O.S. */
export async function searchVeiculos(
  query: string,
  limit = 12,
): Promise<EquipamentoRow[]> {
  const q = (query ?? "").trim();
  if (q.length < 1) return [];

  if (!hasSupabase()) {
    const norm = normalizeSearch(q);
    return MOCK_EQUIPAMENTOS.filter((e) => e.tipo === "veiculo")
      .filter(
        (e) =>
          normalizeSearch(e.descricao).includes(norm) ||
          normalizeSearch(e.codigo).includes(norm) ||
          normalizeSearch(e.placa ?? "").includes(norm),
      )
      .slice(0, limit)
      .map(mockToRow);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("tipo", "veiculo")
    .or(`descricao.ilike.%${q}%,codigo.ilike.%${q}%,placa.ilike.%${q}%`)
    .order("descricao", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[searchVeiculos]", error.message);
    return [];
  }
  return (data ?? []) as EquipamentoRow[];
}

export async function getEquipamento(id: string): Promise<EquipamentoRow | null> {
  if (!id) return null;
  if (!hasSupabase()) {
    const e = MOCK_EQUIPAMENTOS.find((x) => x.id === id);
    return e ? mockToRow(e) : null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[getEquipamento]", error.message);
    return null;
  }
  return data as EquipamentoRow | null;
}

function validar(input: EquipamentoInput): string | null {
  if (!input.descricao?.trim()) return "Descrição é obrigatória.";
  return null;
}

function dados(input: EquipamentoInput) {
  return clean({
    descricao: input.descricao.trim(),
    tipo: input.tipo,
    placa: input.placa ?? null,
    marca: input.marca ?? null,
    modelo: input.modelo ?? null,
    ano: input.ano ?? null,
    status: input.status,
    observacoes: input.observacoes ?? null,
  });
}

/** Próximo código EQ-NNN. */
async function proximoCodigo(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const prefixo = "EQ-";
  const { data } = await supabase
    .from(TABLE)
    .select("codigo")
    .like("codigo", `${prefixo}%`);
  let max = 0;
  for (const row of data ?? []) {
    const n = Number(String((row as { codigo: string }).codigo).slice(prefixo.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefixo}${String(max + 1).padStart(3, "0")}`;
}

export async function createEquipamento(
  input: EquipamentoInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const erro = validar(input);
  if (erro) return { ok: false, error: erro };
  if (!hasSupabase()) return { ok: true, id: `eq-${Date.now().toString(36)}` };

  const supabase = await createClient();
  const codigo = input.codigo?.trim() || (await proximoCodigo(supabase));
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...dados(input), codigo })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Já existe um equipamento com este código." };
    }
    console.error("[createEquipamento]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  return { ok: true, id: (data as { id: string }).id };
}

export async function updateEquipamento(
  id: string,
  input: EquipamentoInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const erro = validar(input);
  if (erro) return { ok: false, error: erro };
  if (!hasSupabase()) return { ok: true };

  const supabase = await createClient();
  const payload = {
    ...dados(input),
    ...(input.codigo?.trim() ? { codigo: input.codigo.trim() } : {}),
  };
  const { error } = await supabase.from(TABLE).update(payload).eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Já existe um equipamento com este código." };
    }
    console.error("[updateEquipamento]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  return { ok: true };
}

export async function deleteEquipamento(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[deleteEquipamento]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  return { ok: true };
}
