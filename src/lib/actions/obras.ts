"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getOrcamento } from "@/lib/actions/orcamentos";
import type {
  ObraListRow,
  ObraDetalhe,
  ObraStatus,
} from "@/lib/types/obra";

const TABLE = "obras";
const BASE_PATH = "/obras";

const CLIENTE_SELECT =
  "cliente:clientes(razao_social, nome_fantasia, cnpj_cpf, responsavel, cidade, estado)";

const today = () => new Date().toISOString().slice(0, 10);

export type ObraInput = {
  numero?: string | null;
  nome: string;
  cliente_id: string;
  responsavel?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  status: ObraStatus;
  data_inicio?: string | null;
  data_fim_prevista?: string | null;
  data_fim_real?: string | null;
  valor_total?: number | null;
  mao_obra_direta?: number | null;
  mao_obra_indireta?: number | null;
  observacoes?: string | null;
};

function clean<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === "") (out as Record<string, unknown>)[k] = null;
  }
  return out;
}

/** Soma de medições (valor_total) por obra → mapa obraId → valor medido. */
async function medidoPorObra(
  supabase: Awaited<ReturnType<typeof createClient>>,
  obraIds: string[],
): Promise<Map<string, number>> {
  const mapa = new Map<string, number>();
  if (obraIds.length === 0) return mapa;
  const { data, error } = await supabase
    .from("medicoes")
    .select("obra_id, valor_total")
    .in("obra_id", obraIds)
    .neq("status", "rejeitada");
  if (error) {
    console.error("[medidoPorObra]", error.message);
    return mapa;
  }
  for (const m of data ?? []) {
    const row = m as { obra_id: string; valor_total: number };
    mapa.set(row.obra_id, (mapa.get(row.obra_id) ?? 0) + Number(row.valor_total || 0));
  }
  return mapa;
}

/** Próximo número OB-AAAA-NNN do ano corrente. */
export async function proximoNumeroObra(): Promise<string> {
  const ano = new Date().getFullYear();
  const prefixo = `OB-${ano}-`;
  if (!hasSupabase()) return `${prefixo}001`;
  const supabase = await createClient();
  const { data } = await supabase
    .from(TABLE)
    .select("numero")
    .like("numero", `${prefixo}%`);
  let max = 0;
  for (const row of data ?? []) {
    const n = Number(String((row as { numero: string }).numero).slice(prefixo.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefixo}${String(max + 1).padStart(3, "0")}`;
}

export async function listObras(): Promise<ObraListRow[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(`*, ${CLIENTE_SELECT}`)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[listObras]", error.message);
    return [];
  }
  const obras = (data ?? []) as unknown as ObraListRow[];
  const medido = await medidoPorObra(
    supabase,
    obras.map((o) => o.id),
  );
  for (const o of obras) o.valor_medido = medido.get(o.id) ?? 0;
  return obras;
}

export async function getObra(id: string): Promise<ObraDetalhe | null> {
  if (!id || !hasSupabase()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(`*, ${CLIENTE_SELECT}`)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[getObra]", error.message);
    return null;
  }
  if (!data) return null;
  const obra = data as unknown as ObraDetalhe;
  const medido = await medidoPorObra(supabase, [obra.id]);
  obra.valor_medido = medido.get(obra.id) ?? 0;
  return obra;
}

function dados(input: ObraInput) {
  return clean({
    nome: input.nome.trim(),
    cliente_id: input.cliente_id || null,
    responsavel: input.responsavel ?? null,
    endereco: input.endereco ?? null,
    cidade: input.cidade ?? null,
    estado: input.estado ?? null,
    status: input.status,
    data_inicio: input.data_inicio || null,
    data_fim_prevista: input.data_fim_prevista || null,
    data_fim_real: input.data_fim_real || null,
    valor_total: input.valor_total ?? 0,
    mao_obra_direta: input.mao_obra_direta ?? 0,
    mao_obra_indireta: input.mao_obra_indireta ?? 0,
    observacoes: input.observacoes ?? null,
  });
}

function validar(input: ObraInput): string | null {
  if (!input.nome?.trim()) return "Nome da obra é obrigatório.";
  if (!input.cliente_id) return "Cliente é obrigatório.";
  return null;
}

export async function createObra(
  input: ObraInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const erro = validar(input);
  if (erro) return { ok: false, error: erro };
  if (!hasSupabase()) return { ok: true, id: `obra-${Date.now().toString(36)}` };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const numero =
      tentativa === 0 && input.numero?.trim()
        ? input.numero.trim()
        : await proximoNumeroObra();
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ ...dados(input), numero, user_id: user.id })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") continue;
      console.error("[createObra]", error.message);
      return { ok: false, error: error.message };
    }
    revalidatePath(BASE_PATH);
    return { ok: true, id: (data as { id: string }).id };
  }
  return { ok: false, error: "Não foi possível gerar um número único. Tente novamente." };
}

export async function updateObra(
  id: string,
  input: ObraInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const erro = validar(input);
  if (erro) return { ok: false, error: erro };
  if (!hasSupabase()) return { ok: true };

  const supabase = await createClient();
  const payload = {
    ...dados(input),
    ...(input.numero?.trim() ? { numero: input.numero.trim() } : {}),
  };
  const { error } = await supabase.from(TABLE).update(payload).eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Já existe uma obra com este número." };
    }
    console.error("[updateObra]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  revalidatePath(`${BASE_PATH}/${id}`);
  revalidatePath(`${BASE_PATH}/${id}/editar`);
  return { ok: true };
}

export async function deleteObra(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[deleteObra]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  return { ok: true };
}

/**
 * Converte um orçamento aprovado em obra:
 *  - cria a obra copiando cliente, local e valores do orçamento;
 *  - mão de obra direta = soma da MO dos itens;
 *  - marca o orçamento como aprovado e vincula obra_id.
 */
export async function converterOrcamentoEmObra(
  orcamentoId: string,
): Promise<{ ok: true; obraId: string } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: false, error: "Supabase não configurado." };

  const orcamento = await getOrcamento(orcamentoId);
  if (!orcamento) return { ok: false, error: "Orçamento não encontrado." };
  if (orcamento.obra_id) {
    return { ok: false, error: "Este orçamento já foi convertido em obra." };
  }
  if (!orcamento.cliente_id) {
    return { ok: false, error: "O orçamento precisa de um cliente." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const maoObraDireta = orcamento.itens.reduce(
    (acc, i) => acc + Number(i.valor_total_mao_obra || 0),
    0,
  );

  let obraId = "";
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const numero = await proximoNumeroObra();
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        numero,
        empresa_id: orcamento.empresa_id,
        cliente_id: orcamento.cliente_id,
        orcamento_id: orcamento.id,
        nome: orcamento.descricao?.trim() || `Obra do orçamento ${orcamento.numero}`,
        responsavel: orcamento.responsavel,
        endereco: orcamento.endereco,
        cidade: orcamento.cidade,
        estado: orcamento.estado,
        valor_total: orcamento.valor_total,
        mao_obra_direta: maoObraDireta,
        mao_obra_indireta: 0,
        status: "planejamento",
        user_id: user.id,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") continue;
      console.error("[converterOrcamentoEmObra] obra", error.message);
      return { ok: false, error: error.message };
    }
    obraId = (data as { id: string }).id;
    break;
  }
  if (!obraId) {
    return { ok: false, error: "Não foi possível gerar o número da obra." };
  }

  const { error: upErr } = await supabase
    .from("orcamentos")
    .update({ obra_id: obraId, status: "aprovado", data_aprovacao: today() })
    .eq("id", orcamento.id);
  if (upErr) {
    console.error("[converterOrcamentoEmObra] vínculo", upErr.message);
    // Obra criada, mas vínculo falhou — desfaz para não duplicar na próxima.
    await supabase.from(TABLE).delete().eq("id", obraId);
    return { ok: false, error: upErr.message };
  }

  revalidatePath(BASE_PATH);
  revalidatePath(`/comercial/orcamentos/${orcamento.id}`);
  revalidatePath("/comercial/orcamentos");
  return { ok: true, obraId };
}
