"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getEmpresaAtivaId } from "@/lib/actions/empresas";
import { getCurrentProfile } from "@/lib/actions/usuarios";
import type {
  CompraPedidoListRow,
  CompraPedidoDetalhe,
  CompraPedidoItem,
  CompraCotacao,
  CompraHistorico,
  CompraStatus,
  CompraPrioridade,
} from "@/lib/types/compras";

const TABLE = "compras_pedidos";
const BASE_PATH = "/producao/compras";

const OBRA_SELECT = "obra:obras(numero, nome)";
const FORNECEDOR_SELECT = "fornecedor:fornecedores(nome, nome_fantasia)";
const SOLICITANTE_SELECT = "solicitante:colaboradores(nome_completo, cargo)";

type Supa = Awaited<ReturnType<typeof createClient>>;

function clean<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out)) if (out[k] === "") (out as Record<string, unknown>)[k] = null;
  return out;
}

// ── Inputs ─────────────────────────────────────────────────────────────────────

export type PedidoItemInput = {
  material_id?: string | null;
  descricao: string;
  unidade?: string;
  quantidade: number;
  valor_estimado_unit?: number;
  observacoes?: string | null;
};

export type PedidoInput = {
  obra_id?: string | null;
  empresa_id?: string | null;
  prioridade: CompraPrioridade;
  titulo: string;
  justificativa?: string | null;
  data_limite?: string | null;
  observacoes?: string | null;
  itens: PedidoItemInput[];
};

// ── Número sequencial (PC-AAAA-NNN) ────────────────────────────────────────────

export async function proximoNumeroCompra(): Promise<string> {
  const ano = new Date().getFullYear();
  const prefixo = `PC-${ano}-`;
  if (!hasSupabase()) return `${prefixo}001`;
  const supabase = await createClient();
  const { data } = await supabase.from(TABLE).select("numero").like("numero", `${prefixo}%`);
  let max = 0;
  for (const row of data ?? []) {
    const n = Number(String((row as { numero: string }).numero).slice(prefixo.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefixo}${String(max + 1).padStart(3, "0")}`;
}

// ── Histórico ──────────────────────────────────────────────────────────────────

async function registrarHistorico(
  supabase: Supa,
  pedidoId: string,
  de: CompraStatus | null,
  para: CompraStatus,
  comentario: string | null,
  usuarioId: string | null,
) {
  const { error } = await supabase.from("compras_historico").insert({
    pedido_id: pedidoId,
    de_status: de,
    para_status: para,
    comentario: comentario ?? null,
    usuario_id: usuarioId,
  });
  if (error) console.error("[registrarHistorico]", error.message);
}

// ── Listagem ───────────────────────────────────────────────────────────────────

export async function listPedidos(filtros?: {
  status?: CompraStatus;
  obra_id?: string;
  /** Empresa do escopo. Omitido = empresa ativa; "todas" = sem filtro. */
  empresa_id?: string | "todas";
}): Promise<CompraPedidoListRow[]> {
  if (!hasSupabase()) return [];
  const escopo = filtros?.empresa_id ?? (await getEmpresaAtivaId());
  const supabase = await createClient();
  let q = supabase
    .from(TABLE)
    .select(
      `*, ${OBRA_SELECT}, ${FORNECEDOR_SELECT}, ${SOLICITANTE_SELECT}, compras_pedido_itens(count)`,
    )
    .order("created_at", { ascending: false });
  if (escopo && escopo !== "todas") q = q.eq("empresa_id", escopo);
  if (filtros?.status) q = q.eq("status", filtros.status);
  if (filtros?.obra_id) q = q.eq("obra_id", filtros.obra_id);
  const { data, error } = await q;
  if (error) {
    console.error("[listPedidos]", error.message);
    return [];
  }
  type Row = Record<string, unknown> & { compras_pedido_itens?: { count: number }[] };
  return ((data ?? []) as Row[]).map((r) => {
    const count = Array.isArray(r.compras_pedido_itens)
      ? Number(r.compras_pedido_itens[0]?.count ?? 0)
      : 0;
    return { ...(r as unknown as CompraPedidoListRow), itens_count: count };
  });
}

export async function listPedidosByObra(obraId: string): Promise<CompraPedidoListRow[]> {
  if (!obraId) return [];
  // A obra já define a empresa — não escopar pela empresa ativa.
  return listPedidos({ obra_id: obraId, empresa_id: "todas" });
}

// ── Detalhe ────────────────────────────────────────────────────────────────────

export async function getPedido(id: string): Promise<CompraPedidoDetalhe | null> {
  if (!id || !hasSupabase()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(`*, ${OBRA_SELECT}, ${FORNECEDOR_SELECT}, ${SOLICITANTE_SELECT}`)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[getPedido]", error.message);
    return null;
  }
  if (!data) return null;
  const pedido = data as unknown as CompraPedidoDetalhe;

  const [{ data: itens }, { data: cotacoes }, { data: historico }] = await Promise.all([
    supabase.from("compras_pedido_itens").select("*").eq("pedido_id", id).order("created_at"),
    supabase
      .from("compras_cotacoes")
      .select("*")
      .eq("pedido_id", id)
      .order("valor_total", { ascending: true }),
    supabase
      .from("compras_historico")
      .select("*")
      .eq("pedido_id", id)
      .order("created_at", { ascending: true }),
  ]);

  pedido.itens = (itens ?? []) as CompraPedidoItem[];
  pedido.cotacoes = (cotacoes ?? []) as CompraCotacao[];
  pedido.historico = (historico ?? []) as CompraHistorico[];

  // saldo de estoque para itens de catálogo
  const matIds = pedido.itens.filter((i) => i.material_id).map((i) => i.material_id as string);
  if (matIds.length) {
    const { data: estoque } = await supabase
      .from("materiais_estoque")
      .select("material_id, quantidade_atual")
      .in("material_id", matIds);
    const saldo: Record<string, number> = {};
    for (const e of (estoque ?? []) as { material_id: string; quantidade_atual: number }[]) {
      saldo[e.material_id] = Number(e.quantidade_atual ?? 0);
    }
    pedido.itens = pedido.itens.map((i) => ({
      ...i,
      saldo_estoque: i.material_id ? (saldo[i.material_id] ?? 0) : null,
    }));
  }
  return pedido;
}

// ── Criar / editar / excluir ───────────────────────────────────────────────────

function somaItens(itens: PedidoItemInput[]): number {
  return itens.reduce(
    (acc, i) => acc + Number(i.quantidade ?? 0) * Number(i.valor_estimado_unit ?? 0),
    0,
  );
}

export async function createPedido(
  input: PedidoInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!input.titulo?.trim()) return { ok: false, error: "Informe um título para o pedido." };
  const itens = (input.itens ?? []).filter((i) => i.descricao?.trim() && i.quantidade > 0);
  if (itens.length === 0) return { ok: false, error: "Adicione ao menos um item." };
  if (!hasSupabase()) return { ok: true, id: `pc-${Date.now().toString(36)}` };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const empresaId = input.empresa_id || (await getEmpresaAtivaId());
  const profile = await getCurrentProfile();
  const solicitanteNome = profile?.nome ?? user.email ?? null;

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const numero = await proximoNumeroCompra();
    const { data, error } = await supabase
      .from(TABLE)
      .insert(
        clean({
          numero,
          obra_id: input.obra_id || null,
          empresa_id: empresaId,
          solicitante_nome: solicitanteNome,
          prioridade: input.prioridade,
          status: "solicitacao",
          titulo: input.titulo.trim(),
          justificativa: input.justificativa ?? null,
          data_limite: input.data_limite || null,
          observacoes: input.observacoes ?? null,
          valor_estimado: somaItens(itens),
          user_id: user.id,
        }),
      )
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") continue;
      console.error("[createPedido]", error.message);
      return { ok: false, error: error.message };
    }
    const pedidoId = (data as { id: string }).id;
    const linhas = itens.map((i) => ({
      pedido_id: pedidoId,
      material_id: i.material_id || null,
      descricao: i.descricao.trim(),
      unidade: i.unidade?.trim() || "UN",
      quantidade: i.quantidade,
      valor_estimado_unit: i.valor_estimado_unit ?? 0,
      qtd_comprar: i.quantidade, // default: comprar tudo (ajustado na triagem)
      observacoes: i.observacoes?.trim() || null,
    }));
    const { error: itErr } = await supabase.from("compras_pedido_itens").insert(linhas);
    if (itErr) console.error("[createPedido] itens", itErr.message);
    await registrarHistorico(supabase, pedidoId, null, "solicitacao", "Pedido criado", user.id);
    revalidatePath(BASE_PATH);
    return { ok: true, id: pedidoId };
  }
  return { ok: false, error: "Não foi possível gerar um número único. Tente novamente." };
}

export async function deletePedido(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[deletePedido]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  return { ok: true };
}

// ── Transição genérica de status ───────────────────────────────────────────────

async function getStatus(supabase: Supa, id: string): Promise<CompraStatus | null> {
  const { data } = await supabase.from(TABLE).select("status").eq("id", id).maybeSingle();
  return (data as { status: CompraStatus } | null)?.status ?? null;
}

async function transicionar(
  id: string,
  paraStatus: CompraStatus,
  comentario: string | null,
  extra?: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const de = await getStatus(supabase, id);
  const { error } = await supabase
    .from(TABLE)
    .update(clean({ status: paraStatus, ...(extra ?? {}) }))
    .eq("id", id);
  if (error) {
    console.error("[transicionar]", error.message);
    return { ok: false, error: error.message };
  }
  await registrarHistorico(supabase, id, de, paraStatus, comentario, user?.id ?? null);
  revalidatePath(BASE_PATH);
  revalidatePath(`${BASE_PATH}/${id}`);
  return { ok: true };
}

/** Avança/move o pedido para um status, registrando o histórico. */
export async function avancarStatus(
  id: string,
  paraStatus: CompraStatus,
  comentario?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return transicionar(id, paraStatus, comentario ?? null);
}

export async function cancelarPedido(
  id: string,
  motivo?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return transicionar(id, "cancelado", motivo ?? "Pedido cancelado");
}

// ── Triagem ────────────────────────────────────────────────────────────────────

/** Salva a decisão de triagem por item e move para Cotação (ou Compra, se tudo do estoque). */
export async function salvarTriagem(
  pedidoId: string,
  itens: { id: string; qtd_estoque: number; qtd_comprar: number }[],
  avancar = true,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  for (const it of itens) {
    const { error } = await supabase
      .from("compras_pedido_itens")
      .update({
        qtd_estoque: Math.max(0, Number(it.qtd_estoque) || 0),
        qtd_comprar: Math.max(0, Number(it.qtd_comprar) || 0),
      })
      .eq("id", it.id);
    if (error) console.error("[salvarTriagem] item", error.message);
  }
  if (!avancar) {
    revalidatePath(`${BASE_PATH}/${pedidoId}`);
    return { ok: true };
  }
  // se nada precisa ser comprado, pula direto para a retirada (tudo do estoque)
  const precisaComprar = itens.some((i) => Number(i.qtd_comprar) > 0);
  const proximo: CompraStatus = precisaComprar ? "cotacao" : "compra";
  const comentario = precisaComprar
    ? "Triagem concluída — segue para cotação"
    : "Triagem concluída — atendido pelo estoque";
  return transicionar(pedidoId, proximo, comentario);
}

// ── Cotações ───────────────────────────────────────────────────────────────────

export async function addCotacao(input: {
  pedido_id: string;
  fornecedor_id?: string | null;
  fornecedor_nome?: string | null;
  valor_total: number;
  prazo_entrega_dias?: number | null;
  condicoes_pagamento?: string | null;
  observacoes?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.pedido_id) return { ok: false, error: "Pedido não informado." };
  if (!input.fornecedor_id && !input.fornecedor_nome?.trim()) {
    return { ok: false, error: "Informe o fornecedor." };
  }
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("compras_cotacoes").insert(
    clean({
      pedido_id: input.pedido_id,
      fornecedor_id: input.fornecedor_id || null,
      fornecedor_nome: input.fornecedor_nome?.trim() || null,
      valor_total: input.valor_total ?? 0,
      prazo_entrega_dias: input.prazo_entrega_dias ?? null,
      condicoes_pagamento: input.condicoes_pagamento ?? null,
      observacoes: input.observacoes ?? null,
    }),
  );
  if (error) {
    console.error("[addCotacao]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(`${BASE_PATH}/${input.pedido_id}`);
  return { ok: true };
}

export async function removeCotacao(
  id: string,
  pedidoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("compras_cotacoes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`${BASE_PATH}/${pedidoId}`);
  return { ok: true };
}

/** Seleciona a cotação vencedora e move o pedido para Aprovação. */
export async function selecionarCotacao(
  cotacaoId: string,
  pedidoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { data: cot, error: cotErr } = await supabase
    .from("compras_cotacoes")
    .select("fornecedor_id, valor_total")
    .eq("id", cotacaoId)
    .maybeSingle();
  if (cotErr || !cot) return { ok: false, error: cotErr?.message ?? "Cotação não encontrada." };

  await supabase.from("compras_cotacoes").update({ selecionada: false }).eq("pedido_id", pedidoId);
  await supabase.from("compras_cotacoes").update({ selecionada: true }).eq("id", cotacaoId);

  const c = cot as { fornecedor_id: string | null; valor_total: number };
  return transicionar(pedidoId, "aprovacao", "Cotação selecionada — aguardando aprovação", {
    fornecedor_id: c.fornecedor_id,
    valor_estimado: c.valor_total,
    valor_final: c.valor_total,
  });
}

// ── Aprovação ──────────────────────────────────────────────────────────────────

export async function aprovarPedido(
  id: string,
  comentario?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return transicionar(id, "compra", comentario ?? "Pedido aprovado");
}

export async function reprovarPedido(
  id: string,
  motivo?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // volta para cotação para nova rodada
  return transicionar(id, "cotacao", motivo ?? "Pedido reprovado — refazer cotação");
}

// ── Compra → Entrega (recebimento dá entrada no estoque) ───────────────────────

export async function registrarEntrega(
  id: string,
  input: { numero_nf?: string | null; data_entrega?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pedido } = await supabase
    .from(TABLE)
    .select("empresa_id")
    .eq("id", id)
    .maybeSingle();
  const empresaId = (pedido as { empresa_id: string | null } | null)?.empresa_id ?? null;

  // entrada no estoque dos itens de catálogo que foram comprados
  const { data: itens } = await supabase
    .from("compras_pedido_itens")
    .select("material_id, qtd_comprar, valor_estimado_unit")
    .eq("pedido_id", id);
  const entradas = ((itens ?? []) as {
    material_id: string | null;
    qtd_comprar: number;
    valor_estimado_unit: number;
  }[])
    .filter((i) => i.material_id && Number(i.qtd_comprar) > 0)
    .map((i) => ({
      material_id: i.material_id,
      empresa_id: empresaId,
      tipo: "entrada" as const,
      quantidade: Number(i.qtd_comprar),
      valor_unitario: Number(i.valor_estimado_unit ?? 0),
      pedido_id: id,
      motivo: "Recebimento de compra",
      numero_nf: input.numero_nf ?? null,
      usuario_id: user?.id ?? null,
    }));
  if (entradas.length) {
    const { error } = await supabase.from("materiais_movimentacoes").insert(entradas);
    if (error) {
      console.error("[registrarEntrega] estoque", error.message);
      return { ok: false, error: error.message };
    }
  }
  revalidatePath("/producao/almoxarifado");
  return transicionar(id, "entrega", "Mercadoria recebida — entrada no estoque", {
    numero_nf: input.numero_nf ?? null,
    data_entrega: input.data_entrega || new Date().toISOString().slice(0, 10),
  });
}

// ── Entrega → Retirada (saída do estoque para a obra = custo realizado) ────────

export async function registrarRetirada(
  id: string,
  input?: { data_retirada?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pedido } = await supabase
    .from(TABLE)
    .select("obra_id, empresa_id")
    .eq("id", id)
    .maybeSingle();
  const obraId = (pedido as { obra_id: string | null } | null)?.obra_id ?? null;
  const empresaId = (pedido as { empresa_id: string | null } | null)?.empresa_id ?? null;

  const { data: itens } = await supabase
    .from("compras_pedido_itens")
    .select("material_id, quantidade, valor_estimado_unit")
    .eq("pedido_id", id);
  const saidas = ((itens ?? []) as {
    material_id: string | null;
    quantidade: number;
    valor_estimado_unit: number;
  }[])
    .filter((i) => i.material_id && Number(i.quantidade) > 0)
    .map((i) => ({
      material_id: i.material_id,
      empresa_id: empresaId,
      tipo: "saida" as const,
      quantidade: Number(i.quantidade),
      valor_unitario: Number(i.valor_estimado_unit ?? 0),
      obra_id: obraId,
      pedido_id: id,
      motivo: "Retirada para obra",
      usuario_id: user?.id ?? null,
    }));
  if (saidas.length) {
    const { error } = await supabase.from("materiais_movimentacoes").insert(saidas);
    if (error) {
      console.error("[registrarRetirada] estoque", error.message);
      return { ok: false, error: error.message };
    }
  }
  revalidatePath("/producao/almoxarifado");
  if (obraId) revalidatePath(`/obras/${obraId}`);
  return transicionar(id, "retirada", "Material retirado para a obra", {
    data_retirada: input?.data_retirada || new Date().toISOString().slice(0, 10),
  });
}
