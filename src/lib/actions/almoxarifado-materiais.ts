"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getEmpresaAtivaId } from "@/lib/actions/empresas";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type MaterialEstoque = {
  material_id: string;
  codigo: string | null;
  descricao: string;
  categoria: string;
  unidade_medida: string;
  valor_referencia: number;
  quantidade_atual: number;
  estoque_minimo: number;
  abaixo_minimo: boolean;
};

export type MaterialMovimentacao = {
  id: string;
  material_id: string;
  material_descricao: string;
  material_codigo: string | null;
  tipo: "entrada" | "saida";
  quantidade: number;
  valor_unitario: number;
  obra_id: string | null;
  obra_nome: string | null;
  pedido_id: string | null;
  motivo: string | null;
  numero_nf: string | null;
  created_at: string;
};

function embed<T>(v: unknown): T | null {
  if (!v) return null;
  return (Array.isArray(v) ? v[0] : v) as T;
}

const ESTOQUE_PATH = "/producao/almoxarifado";

// ── Saldo de estoque ──────────────────────────────────────────────────────────

/** Saldo do almoxarifado de materiais da empresa (mínimo vindo de `materiais`). */
export async function listEstoqueMateriais(
  empresaId?: string,
): Promise<MaterialEstoque[]> {
  if (!hasSupabase()) return [];
  const escopo = empresaId ?? (await getEmpresaAtivaId());
  const supabase = await createClient();
  let q = supabase
    .from("materiais")
    .select(
      "id, codigo, descricao, categoria, unidade_medida, valor_referencia, estoque_minimo, ativo, materiais_estoque(quantidade_atual)",
    )
    .eq("ativo", true)
    .order("descricao", { ascending: true });
  if (escopo) q = q.eq("empresa_id", escopo);
  const { data, error } = await q;
  if (error) {
    console.error("[listEstoqueMateriais]", error.message);
    return [];
  }
  type Row = Record<string, unknown> & { materiais_estoque?: unknown };
  return ((data ?? []) as Row[]).map((r) => {
    const est = embed<{ quantidade_atual: number }>(r.materiais_estoque);
    const atual = Number(est?.quantidade_atual ?? 0);
    const minimo = Number(r.estoque_minimo ?? 0);
    return {
      material_id: String(r.id),
      codigo: (r.codigo as string | null) ?? null,
      descricao: String(r.descricao ?? ""),
      categoria: String(r.categoria ?? "outro"),
      unidade_medida: String(r.unidade_medida ?? "UN"),
      valor_referencia: Number(r.valor_referencia ?? 0),
      quantidade_atual: atual,
      estoque_minimo: minimo,
      abaixo_minimo: minimo > 0 && atual < minimo,
    };
  });
}

/** Saldo atual de um único material (0 se não houver linha). */
export async function getSaldoMaterial(materialId: string): Promise<number> {
  if (!materialId || !hasSupabase()) return 0;
  const supabase = await createClient();
  const { data } = await supabase
    .from("materiais_estoque")
    .select("quantidade_atual")
    .eq("material_id", materialId)
    .maybeSingle();
  return Number((data as { quantidade_atual: number } | null)?.quantidade_atual ?? 0);
}

/** Saldos de vários materiais de uma vez: { material_id → quantidade_atual }. */
export async function getSaldosMateriais(
  materialIds: string[],
): Promise<Record<string, number>> {
  const ids = [...new Set(materialIds.filter(Boolean))];
  if (ids.length === 0 || !hasSupabase()) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materiais_estoque")
    .select("material_id, quantidade_atual")
    .in("material_id", ids);
  if (error) {
    console.error("[getSaldosMateriais]", error.message);
    return {};
  }
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as { material_id: string; quantidade_atual: number }[]) {
    out[r.material_id] = Number(r.quantidade_atual ?? 0);
  }
  return out;
}

// ── Movimentações ─────────────────────────────────────────────────────────────

export async function listMovimentacoesMateriais(
  limite = 300,
  empresaId?: string,
): Promise<MaterialMovimentacao[]> {
  if (!hasSupabase()) return [];
  const escopo = empresaId ?? (await getEmpresaAtivaId());
  const supabase = await createClient();
  let q = supabase
    .from("materiais_movimentacoes")
    .select(
      "id, material_id, tipo, quantidade, valor_unitario, obra_id, pedido_id, motivo, numero_nf, created_at, materiais(descricao, codigo), obras(nome)",
    )
    .order("created_at", { ascending: false })
    .limit(limite);
  if (escopo) q = q.eq("empresa_id", escopo);
  const { data, error } = await q;
  if (error) {
    console.error("[listMovimentacoesMateriais]", error.message);
    return [];
  }
  type Row = Record<string, unknown> & { materiais?: unknown; obras?: unknown };
  return ((data ?? []) as Row[]).map((r) => {
    const mat = embed<{ descricao?: string; codigo?: string }>(r.materiais);
    const obra = embed<{ nome?: string }>(r.obras);
    return {
      id: String(r.id),
      material_id: String(r.material_id),
      material_descricao: mat?.descricao ?? "—",
      material_codigo: mat?.codigo ?? null,
      tipo: r.tipo as "entrada" | "saida",
      quantidade: Number(r.quantidade ?? 0),
      valor_unitario: Number(r.valor_unitario ?? 0),
      obra_id: (r.obra_id as string | null) ?? null,
      obra_nome: obra?.nome ?? null,
      pedido_id: (r.pedido_id as string | null) ?? null,
      motivo: (r.motivo as string | null) ?? null,
      numero_nf: (r.numero_nf as string | null) ?? null,
      created_at: String(r.created_at),
    };
  });
}

/** Lança uma entrada/saída avulsa de material (saldo é mantido por trigger). */
export async function registrarMovimentacaoMaterial(input: {
  material_id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  valor_unitario?: number | null;
  obra_id?: string | null;
  motivo?: string | null;
  numero_nf?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.material_id) return { ok: false, error: "Material não informado." };
  if (!Number.isFinite(input.quantidade) || input.quantidade <= 0) {
    return { ok: false, error: "Quantidade deve ser maior que zero." };
  }
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // empresa derivada do próprio material (catálogo é por empresa)
  const { data: mat } = await supabase
    .from("materiais")
    .select("empresa_id")
    .eq("id", input.material_id)
    .maybeSingle();
  const { error } = await supabase.from("materiais_movimentacoes").insert({
    material_id: input.material_id,
    empresa_id: (mat as { empresa_id: string | null } | null)?.empresa_id ?? null,
    tipo: input.tipo,
    quantidade: input.quantidade,
    valor_unitario: input.valor_unitario ?? 0,
    obra_id: input.obra_id ?? null,
    motivo: input.motivo ?? null,
    numero_nf: input.numero_nf ?? null,
    usuario_id: user?.id ?? null,
  });
  if (error) {
    console.error("[registrarMovimentacaoMaterial]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(ESTOQUE_PATH);
  return { ok: true };
}

// ── Custo de materiais por obra (custo realizado) ─────────────────────────────

export type CustoComprasObra = {
  total: number;
  itens_consumidos: number;
};

/**
 * Custo realizado de materiais de uma obra = saídas (retiradas) valoradas
 * lançadas no almoxarifado com `obra_id`.
 */
export async function getCustoComprasByObra(
  obraId: string,
): Promise<CustoComprasObra> {
  if (!obraId || !hasSupabase()) return { total: 0, itens_consumidos: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materiais_movimentacoes")
    .select("quantidade, valor_unitario")
    .eq("obra_id", obraId)
    .eq("tipo", "saida");
  if (error) {
    console.error("[getCustoComprasByObra]", error.message);
    return { total: 0, itens_consumidos: 0 };
  }
  const rows = (data ?? []) as { quantidade: number; valor_unitario: number }[];
  const total = rows.reduce(
    (acc, r) => acc + Number(r.quantidade ?? 0) * Number(r.valor_unitario ?? 0),
    0,
  );
  return { total, itens_consumidos: rows.length };
}
