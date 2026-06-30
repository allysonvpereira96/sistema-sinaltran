"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { listObras } from "@/lib/actions/obras";
import type { ObraListRow } from "@/lib/types/obra";
import {
  medicaoSituacao,
  type MedicaoStatus,
  type FormaRecebimento,
  type MedicaoRow,
  type MedicaoListRow,
  type MedicaoDetalhe,
} from "@/lib/types/medicao";

const TABLE = "medicoes";
const BASE_PATH = "/financeiro/receber";

const OBRA_SELECT =
  "obra:obras(id, numero, nome, valor_total, responsavel, cliente:clientes(razao_social, nome_fantasia))";

const today = () => new Date().toISOString().slice(0, 10);

export type MedicaoInput = {
  obra_id: string;
  numero: number;
  data_inicio: string;
  data_fim: string;
  valor_total?: number | null;
  percentual_executado?: number | null;
  status: MedicaoStatus;
  data_envio?: string | null;
  data_aprovacao?: string | null;
  data_previsao_recebimento?: string | null;
  data_faturamento?: string | null;
  numero_nf?: string | null;
  data_vencimento?: string | null;
  forma_recebimento?: FormaRecebimento | null;
  valor_recebido?: number | null;
  observacoes?: string | null;
};

function clean<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === "") (out as Record<string, unknown>)[k] = null;
  }
  return out;
}

/** Obras para o seletor da medição (id, número, nome, valores). */
export async function listObrasParaMedicao(): Promise<ObraListRow[]> {
  return listObras();
}

/** Próximo número da medição dentro da obra. */
export async function proximoNumeroMedicao(obraId: string): Promise<number> {
  if (!obraId || !hasSupabase()) return 1;
  const supabase = await createClient();
  const { data } = await supabase
    .from(TABLE)
    .select("numero")
    .eq("obra_id", obraId)
    .order("numero", { ascending: false })
    .limit(1);
  const ultimo = (data?.[0] as { numero: number } | undefined)?.numero ?? 0;
  return ultimo + 1;
}

export async function listMedicoes(): Promise<MedicaoListRow[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(`*, ${OBRA_SELECT}`)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[listMedicoes]", error.message);
    return [];
  }
  return (data ?? []) as unknown as MedicaoListRow[];
}

export async function getMedicao(id: string): Promise<MedicaoDetalhe | null> {
  if (!id || !hasSupabase()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(`*, ${OBRA_SELECT}`)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[getMedicao]", error.message);
    return null;
  }
  if (!data) return null;
  const medicao = data as unknown as MedicaoDetalhe;

  // Demais medições da mesma obra + total medido (não rejeitadas).
  const { data: irmas } = await supabase
    .from(TABLE)
    .select("*")
    .eq("obra_id", medicao.obra_id)
    .order("numero", { ascending: true });
  const todas = (irmas ?? []) as MedicaoRow[];
  medicao.outras = todas.filter((m) => m.id !== medicao.id);
  medicao.obra_valor_medido = todas
    .filter((m) => m.status !== "rejeitada")
    .reduce((acc, m) => acc + Number(m.valor_total || 0), 0);
  return medicao;
}

function dados(input: MedicaoInput) {
  return clean({
    obra_id: input.obra_id,
    numero: input.numero,
    data_inicio: input.data_inicio,
    data_fim: input.data_fim,
    valor_total: input.valor_total ?? 0,
    percentual_executado: input.percentual_executado ?? 0,
    status: input.status,
    data_envio: input.data_envio || null,
    data_aprovacao:
      input.data_aprovacao ||
      (input.status === "aprovada" ? today() : null),
    data_previsao_recebimento: input.data_previsao_recebimento || null,
    data_faturamento: input.data_faturamento || null,
    numero_nf: input.numero_nf?.trim() || null,
    data_vencimento: input.data_vencimento || null,
    forma_recebimento: input.forma_recebimento || null,
    valor_recebido: input.valor_recebido ?? null,
    observacoes: input.observacoes || null,
  });
}

function validar(input: MedicaoInput): string | null {
  if (!input.obra_id) return "Obra é obrigatória.";
  if (!input.numero || input.numero < 1) return "Número da medição inválido.";
  if (!input.data_inicio || !input.data_fim) return "Informe o período medido.";
  if (input.data_fim < input.data_inicio)
    return "Data fim deve ser posterior ao início.";
  return null;
}

export async function createMedicao(
  input: MedicaoInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const erro = validar(input);
  if (erro) return { ok: false, error: erro };
  if (!hasSupabase()) return { ok: true, id: `med-${Date.now().toString(36)}` };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...dados(input), user_id: user.id })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Já existe uma medição com este número nesta obra." };
    }
    console.error("[createMedicao]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  revalidatePath(`/obras/${input.obra_id}`);
  return { ok: true, id: (data as { id: string }).id };
}

export async function updateMedicao(
  id: string,
  input: MedicaoInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const erro = validar(input);
  if (erro) return { ok: false, error: erro };
  if (!hasSupabase()) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update(dados(input)).eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Já existe uma medição com este número nesta obra." };
    }
    console.error("[updateMedicao]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  revalidatePath(`${BASE_PATH}/${id}`);
  revalidatePath(`${BASE_PATH}/${id}/editar`);
  revalidatePath(`/obras/${input.obra_id}`);
  return { ok: true };
}

export async function deleteMedicao(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[deleteMedicao]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  return { ok: true };
}

/**
 * Baixa do recebível: marca a medição como recebida (ou desfaz a baixa).
 * Aceita data e valor recebido (recebimento parcial). Ao desfazer, limpa ambos.
 */
export async function marcarRecebida(
  id: string,
  recebida: boolean,
  opts?: {
    valor_recebido?: number | null;
    data_recebimento?: string | null;
    forma_recebimento?: FormaRecebimento | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const payload = recebida
    ? {
        data_recebimento: opts?.data_recebimento || today(),
        valor_recebido: opts?.valor_recebido ?? null,
        ...(opts?.forma_recebimento
          ? { forma_recebimento: opts.forma_recebimento }
          : {}),
      }
    : { data_recebimento: null, valor_recebido: null };
  const { error } = await supabase.from(TABLE).update(payload).eq("id", id);
  if (error) {
    console.error("[marcarRecebida]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  revalidatePath(`${BASE_PATH}/${id}`);
  return { ok: true };
}

export type ResumoRecebiveis = {
  aReceberTotal: number;
  aReceberQtd: number;
  vencidoTotal: number;
  vencidoQtd: number;
  aFaturarTotal: number;
  aFaturarQtd: number;
  recebidoMesTotal: number;
  recebidoMesQtd: number;
};

/** Resumo da carteira de recebíveis para o dashboard gerencial. */
export async function getResumoRecebiveis(): Promise<ResumoRecebiveis> {
  const vazio: ResumoRecebiveis = {
    aReceberTotal: 0,
    aReceberQtd: 0,
    vencidoTotal: 0,
    vencidoQtd: 0,
    aFaturarTotal: 0,
    aFaturarQtd: 0,
    recebidoMesTotal: 0,
    recebidoMesQtd: 0,
  };
  if (!hasSupabase()) return vazio;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      "valor_total, valor_recebido, status, data_recebimento, data_vencimento, data_faturamento, numero_nf",
    );
  if (error) {
    console.error("[getResumoRecebiveis]", error.message);
    return vazio;
  }
  const hoje = today();
  const mesAtual = hoje.slice(0, 7);
  const rows = (data ?? []) as Pick<
    MedicaoRow,
    | "valor_total"
    | "valor_recebido"
    | "status"
    | "data_recebimento"
    | "data_vencimento"
    | "data_faturamento"
    | "numero_nf"
  >[];
  const acc = { ...vazio };
  for (const m of rows) {
    const situacao = medicaoSituacao(m, hoje);
    const valor = Number(m.valor_total || 0);
    if (situacao === "a_receber" || situacao === "vencida") {
      acc.aReceberTotal += valor;
      acc.aReceberQtd += 1;
      if (situacao === "vencida") {
        acc.vencidoTotal += valor;
        acc.vencidoQtd += 1;
      }
      if (!m.data_faturamento && !m.numero_nf) {
        acc.aFaturarTotal += valor;
        acc.aFaturarQtd += 1;
      }
    } else if (situacao === "recebida" && m.data_recebimento?.slice(0, 7) === mesAtual) {
      acc.recebidoMesTotal += Number(m.valor_recebido ?? m.valor_total ?? 0);
      acc.recebidoMesQtd += 1;
    }
  }
  return acc;
}
