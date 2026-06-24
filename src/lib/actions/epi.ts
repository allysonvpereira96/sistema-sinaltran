"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EpiCategoria = { id: string; nome: string };
export type EpiMarca = { id: string; nome: string };

export type EpiCatalogo = {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
  categoria_id: string | null;
  categoria_nome: string | null;
  marca_id: string | null;
  marca_nome: string | null;
  fabricante: string | null;
  numero_ca: string | null;
  validade_ca: string | null;
  periodicidade_troca_dias: number | null;
  preco_unitario: number;
  ativo: boolean;
  observacoes: string | null;
  quantidade_atual: number;
  quantidade_minima: number;
};

export type CatalogoInput = {
  codigo: string;
  nome: string;
  tipo: string;
  categoria_id?: string | null;
  marca_id?: string | null;
  fabricante?: string | null;
  numero_ca?: string | null;
  validade_ca?: string | null;
  periodicidade_troca_dias?: number | null;
  preco_unitario?: number | null;
  observacoes?: string | null;
  ativo?: boolean;
  /** Persistido em epi_estoque, não no catálogo. */
  quantidade_minima?: number | null;
};

const PATH = "/epi/catalogo";

function clean<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out)) if (out[k] === "") (out as Record<string, unknown>)[k] = null;
  return out;
}

function embedNome(v: unknown): string | null {
  if (!v) return null;
  const o = Array.isArray(v) ? v[0] : v;
  return (o as { nome?: string } | null)?.nome ?? null;
}

// ── Categorias / Marcas (selects) ─────────────────────────────────────────────

export async function listEpiCategorias(): Promise<EpiCategoria[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("epi_categorias").select("id, nome").order("nome");
  if (error) {
    console.error("[listEpiCategorias]", error.message);
    return [];
  }
  return (data ?? []) as EpiCategoria[];
}

export async function listEpiMarcas(): Promise<EpiMarca[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("epi_marcas").select("id, nome").order("nome");
  if (error) {
    console.error("[listEpiMarcas]", error.message);
    return [];
  }
  return (data ?? []) as EpiMarca[];
}

export async function createEpiCategoria(nome: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!nome.trim()) return { ok: false, error: "Informe o nome." };
  if (!hasSupabase()) return { ok: true, id: "" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("epi_categorias").insert({ nome: nome.trim() }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true, id: (data as { id: string }).id };
}

export async function createEpiMarca(nome: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!nome.trim()) return { ok: false, error: "Informe o nome." };
  if (!hasSupabase()) return { ok: true, id: "" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("epi_marcas").insert({ nome: nome.trim() }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(PATH);
  return { ok: true, id: (data as { id: string }).id };
}

// ── Catálogo ──────────────────────────────────────────────────────────────────

export async function listEpiCatalogo(): Promise<EpiCatalogo[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("epi_catalogo")
    .select(
      "*, epi_categorias(nome), epi_marcas(nome), epi_estoque(quantidade_atual, quantidade_minima)",
    )
    .order("nome", { ascending: true });
  if (error) {
    console.error("[listEpiCatalogo]", error.message);
    return [];
  }
  type Row = Record<string, unknown> & {
    epi_categorias?: unknown;
    epi_marcas?: unknown;
    epi_estoque?: { quantidade_atual: number; quantidade_minima: number } | { quantidade_atual: number; quantidade_minima: number }[] | null;
  };
  return ((data ?? []) as Row[]).map((r) => {
    const est = Array.isArray(r.epi_estoque) ? r.epi_estoque[0] : r.epi_estoque;
    return {
      id: String(r.id),
      codigo: String(r.codigo ?? ""),
      nome: String(r.nome ?? ""),
      tipo: String(r.tipo ?? "EPI"),
      categoria_id: (r.categoria_id as string | null) ?? null,
      categoria_nome: embedNome(r.epi_categorias),
      marca_id: (r.marca_id as string | null) ?? null,
      marca_nome: embedNome(r.epi_marcas),
      fabricante: (r.fabricante as string | null) ?? null,
      numero_ca: (r.numero_ca as string | null) ?? null,
      validade_ca: (r.validade_ca as string | null) ?? null,
      periodicidade_troca_dias: (r.periodicidade_troca_dias as number | null) ?? null,
      preco_unitario: Number(r.preco_unitario ?? 0),
      ativo: Boolean(r.ativo),
      observacoes: (r.observacoes as string | null) ?? null,
      quantidade_atual: Number(est?.quantidade_atual ?? 0),
      quantidade_minima: Number(est?.quantidade_minima ?? 0),
    };
  });
}

export async function createEpiCatalogo(
  input: CatalogoInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!input.codigo?.trim()) return { ok: false, error: "Código é obrigatório." };
  if (!input.nome?.trim()) return { ok: false, error: "Nome é obrigatório." };
  if (!hasSupabase()) return { ok: true, id: "" };

  const supabase = await createClient();
  const { quantidade_minima, ...catalogo } = input;
  const { data, error } = await supabase
    .from("epi_catalogo")
    .insert(clean({ ...catalogo, preco_unitario: input.preco_unitario ?? 0, ativo: input.ativo ?? true }))
    .select("id")
    .single();
  if (error) {
    console.error("[createEpiCatalogo]", error.message);
    return { ok: false, error: error.message };
  }
  const id = (data as { id: string }).id;
  const { error: estErr } = await supabase
    .from("epi_estoque")
    .insert({ catalogo_id: id, quantidade_atual: 0, quantidade_minima: quantidade_minima ?? 0 });
  if (estErr) console.error("[createEpiCatalogo] estoque", estErr.message);
  revalidatePath(PATH);
  return { ok: true, id };
}

export async function updateEpiCatalogo(
  id: string,
  input: CatalogoInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { quantidade_minima, ...catalogo } = input;
  const { error } = await supabase.from("epi_catalogo").update(clean(catalogo)).eq("id", id);
  if (error) {
    console.error("[updateEpiCatalogo]", error.message);
    return { ok: false, error: error.message };
  }
  if (quantidade_minima != null) {
    await supabase.from("epi_estoque").update({ quantidade_minima }).eq("catalogo_id", id);
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteEpiCatalogo(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("epi_catalogo").delete().eq("id", id);
  if (error) {
    // FK restrict em epi_entregas → mensagem amigável
    const msg = /violates foreign key|restrict/i.test(error.message)
      ? "Não dá para excluir: há entregas vinculadas a este item. Inative-o."
      : error.message;
    return { ok: false, error: msg };
  }
  revalidatePath(PATH);
  return { ok: true };
}

// ── Movimentação de estoque (entrada/saída) ───────────────────────────────────

export async function registrarMovimentacaoEpi(input: {
  catalogo_id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  motivo?: string | null;
  numero_nf?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.catalogo_id) return { ok: false, error: "Item não informado." };
  if (!Number.isFinite(input.quantidade) || input.quantidade <= 0) {
    return { ok: false, error: "Quantidade deve ser maior que zero." };
  }
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("epi_movimentacoes_estoque").insert(
    clean({
      catalogo_id: input.catalogo_id,
      tipo: input.tipo,
      quantidade: Math.floor(input.quantidade),
      motivo: input.motivo ?? null,
      numero_nf: input.numero_nf ?? null,
      usuario_id: user?.id ?? null,
    }),
  );
  if (error) {
    console.error("[registrarMovimentacaoEpi]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(PATH);
  revalidatePath("/epi/estoque");
  revalidatePath("/epi/movimentacoes");
  return { ok: true };
}
