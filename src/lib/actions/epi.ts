"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EpiCategoria = { id: string; nome: string };
export type EpiMarca = { id: string; nome: string };

export type EpiMovimentacao = {
  id: string;
  catalogo_id: string;
  item_nome: string;
  item_codigo: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  motivo: string | null;
  numero_nf: string | null;
  created_at: string;
};

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

const PATH = "/almoxarifado/epi/catalogo";

function clean<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out)) if (out[k] === "") (out as Record<string, unknown>)[k] = null;
  return out;
}

/** Soma dias a uma data ISO (YYYY-MM-DD), em UTC. */
function addDays(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
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

/** Ajusta o estoque mínimo de um item. */
export async function setEstoqueMinimoEpi(
  catalogoId: string,
  minimo: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase
    .from("epi_estoque")
    .update({ quantidade_minima: Math.max(0, Math.floor(minimo) || 0) })
    .eq("catalogo_id", catalogoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/almoxarifado/epi/estoque");
  revalidatePath(PATH);
  return { ok: true };
}

// ── Movimentações (ledger) ────────────────────────────────────────────────────

export async function listEpiMovimentacoes(limite = 300): Promise<EpiMovimentacao[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("epi_movimentacoes_estoque")
    .select("id, catalogo_id, tipo, quantidade, motivo, numero_nf, created_at, epi_catalogo(nome, codigo)")
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) {
    console.error("[listEpiMovimentacoes]", error.message);
    return [];
  }
  type Row = Record<string, unknown> & { epi_catalogo?: unknown };
  return ((data ?? []) as Row[]).map((r) => {
    const cat = (Array.isArray(r.epi_catalogo) ? r.epi_catalogo[0] : r.epi_catalogo) as
      | { nome?: string; codigo?: string }
      | null;
    return {
      id: String(r.id),
      catalogo_id: String(r.catalogo_id),
      item_nome: cat?.nome ?? "—",
      item_codigo: cat?.codigo ?? "",
      tipo: r.tipo as "entrada" | "saida",
      quantidade: Number(r.quantidade ?? 0),
      motivo: (r.motivo as string | null) ?? null,
      numero_nf: (r.numero_nf as string | null) ?? null,
      created_at: String(r.created_at),
    };
  });
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
  revalidatePath("/almoxarifado/epi/estoque");
  revalidatePath("/almoxarifado/epi/movimentacoes");
  return { ok: true };
}

// ── Entregas ao colaborador ───────────────────────────────────────────────────

export type EpiEntregaEmUso = {
  id: string;
  catalogo_id: string;
  item_nome: string;
  quantidade: number;
  data_entrega: string;
  data_prevista_troca: string | null;
};

export type EpiEntrega = {
  id: string;
  colaborador_id: string;
  colaborador_nome: string;
  item_nome: string;
  item_codigo: string;
  quantidade: number;
  data_entrega: string;
  data_prevista_troca: string | null;
  data_devolucao: string | null;
  motivo_entrega: string;
  motivo_devolucao: string | null;
  condicao_devolucao: string | null;
  observacoes: string | null;
};

/** EPIs em uso (não devolvidos) de um colaborador. */
export async function listEpiEmUso(colaboradorId: string): Promise<EpiEntregaEmUso[]> {
  if (!colaboradorId || !hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("epi_entregas")
    .select("id, catalogo_id, quantidade, data_entrega, data_prevista_troca, epi_catalogo(nome)")
    .eq("colaborador_id", colaboradorId)
    .is("data_devolucao", null)
    .order("data_entrega", { ascending: false });
  if (error) {
    console.error("[listEpiEmUso]", error.message);
    return [];
  }
  type Row = Record<string, unknown> & { epi_catalogo?: unknown };
  return ((data ?? []) as Row[]).map((r) => {
    const cat = (Array.isArray(r.epi_catalogo) ? r.epi_catalogo[0] : r.epi_catalogo) as { nome?: string } | null;
    return {
      id: String(r.id),
      catalogo_id: String(r.catalogo_id),
      item_nome: cat?.nome ?? "—",
      quantidade: Number(r.quantidade ?? 1),
      data_entrega: String(r.data_entrega),
      data_prevista_troca: (r.data_prevista_troca as string | null) ?? null,
    };
  });
}

/** Histórico de entregas (todas), com colaborador e item. */
export async function listEpiEntregas(limite = 500): Promise<EpiEntrega[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("epi_entregas")
    .select(
      "id, colaborador_id, quantidade, data_entrega, data_prevista_troca, data_devolucao, motivo_entrega, motivo_devolucao, condicao_devolucao, observacoes, colaboradores(nome_completo), epi_catalogo(nome, codigo)",
    )
    .order("data_entrega", { ascending: false })
    .limit(limite);
  if (error) {
    console.error("[listEpiEntregas]", error.message);
    return [];
  }
  type Row = Record<string, unknown> & { colaboradores?: unknown; epi_catalogo?: unknown };
  return ((data ?? []) as Row[]).map((r) => {
    const col = (Array.isArray(r.colaboradores) ? r.colaboradores[0] : r.colaboradores) as { nome_completo?: string } | null;
    const cat = (Array.isArray(r.epi_catalogo) ? r.epi_catalogo[0] : r.epi_catalogo) as { nome?: string; codigo?: string } | null;
    return {
      id: String(r.id),
      colaborador_id: String(r.colaborador_id),
      colaborador_nome: col?.nome_completo ?? "—",
      item_nome: cat?.nome ?? "—",
      item_codigo: cat?.codigo ?? "",
      quantidade: Number(r.quantidade ?? 1),
      data_entrega: String(r.data_entrega),
      data_prevista_troca: (r.data_prevista_troca as string | null) ?? null,
      data_devolucao: (r.data_devolucao as string | null) ?? null,
      motivo_entrega: String(r.motivo_entrega ?? ""),
      motivo_devolucao: (r.motivo_devolucao as string | null) ?? null,
      condicao_devolucao: (r.condicao_devolucao as string | null) ?? null,
      observacoes: (r.observacoes as string | null) ?? null,
    };
  });
}

export type ItemEntrega = {
  catalogo_id: string;
  quantidade: number;
  motivo: string;
  observacoes?: string | null;
  periodicidade_troca_dias?: number | null;
};

/**
 * Registra uma entrega de N itens a um colaborador. Opcionalmente marca EPIs
 * em uso como devolvidos (troca). O estoque é debitado/creditado pelos triggers.
 */
export async function createEntregaEpi(input: {
  colaborador_id: string;
  data_entrega: string;
  itens: ItemEntrega[];
  devolver_ids?: string[];
}): Promise<{ ok: true; total: number } | { ok: false; error: string }> {
  if (!input.colaborador_id) return { ok: false, error: "Selecione um colaborador." };
  if (!input.data_entrega) return { ok: false, error: "Informe a data da entrega." };
  const itens = (input.itens ?? []).filter((i) => i.catalogo_id && i.quantidade > 0);
  if (itens.length === 0) return { ok: false, error: "Adicione ao menos um item." };
  if (!hasSupabase()) return { ok: true, total: itens.length };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1) marca devoluções (troca) — descarte, não retorna ao estoque
  if (input.devolver_ids && input.devolver_ids.length) {
    const { error: devErr } = await supabase
      .from("epi_entregas")
      .update({ data_devolucao: input.data_entrega, condicao_devolucao: "descarte", motivo_devolucao: "Troca" })
      .in("id", input.devolver_ids)
      .is("data_devolucao", null);
    if (devErr) console.error("[createEntregaEpi] devolucao", devErr.message);
  }

  // 2) insere as entregas (trigger debita estoque)
  const linhas = itens.map((i) => ({
    colaborador_id: input.colaborador_id,
    catalogo_id: i.catalogo_id,
    quantidade: Math.floor(i.quantidade),
    data_entrega: input.data_entrega,
    data_prevista_troca: i.periodicidade_troca_dias ? addDays(input.data_entrega, i.periodicidade_troca_dias) : null,
    motivo_entrega: i.motivo || "Primeira entrega",
    observacoes: i.observacoes?.trim() || null,
    usuario_responsavel_id: user?.id ?? null,
  }));
  const { error } = await supabase.from("epi_entregas").insert(linhas);
  if (error) {
    console.error("[createEntregaEpi]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath("/almoxarifado/epi/entregas");
  revalidatePath("/almoxarifado/epi/estoque");
  revalidatePath(PATH);
  return { ok: true, total: itens.length };
}

/** Registra a devolução de uma entrega. */
export async function devolverEpi(input: {
  id: string;
  data_devolucao: string;
  motivo_devolucao?: string | null;
  condicao_devolucao: "aproveitavel" | "descarte";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.id) return { ok: false, error: "Entrega não informada." };
  if (!input.data_devolucao) return { ok: false, error: "Informe a data de devolução." };
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase
    .from("epi_entregas")
    .update(
      clean({
        data_devolucao: input.data_devolucao,
        motivo_devolucao: input.motivo_devolucao ?? null,
        condicao_devolucao: input.condicao_devolucao,
      }),
    )
    .eq("id", input.id)
    .is("data_devolucao", null);
  if (error) {
    console.error("[devolverEpi]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath("/almoxarifado/epi/entregas");
  revalidatePath("/almoxarifado/epi/estoque");
  return { ok: true };
}
