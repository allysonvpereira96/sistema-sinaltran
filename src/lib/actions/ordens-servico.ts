"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import type { OSListRow, OSDetalhe, OSStatus, OSEquipeMembro } from "@/lib/types/os";

const TABLE = "ordens_servico";
const BASE_PATH = "/obras/ordens-servico";

const OBRA_SELECT = "obra:obras(numero, nome)";
const CLIENTE_SELECT = "cliente:clientes(razao_social, nome_fantasia)";
const VEICULO_SELECT = "veiculo:equipamentos(codigo, descricao, placa)";
const ENCARREGADO_SELECT =
  "encarregado:colaboradores!encarregado_id(nome_completo, cargo)";
const MOTORISTA_SELECT =
  "motorista:colaboradores!motorista_id(nome_completo, cargo)";

const LIST_SELECT = `*, ${OBRA_SELECT}, ${CLIENTE_SELECT}, ${ENCARREGADO_SELECT}, ${MOTORISTA_SELECT}`;
const DETALHE_SELECT = `*, ${OBRA_SELECT}, ${CLIENTE_SELECT}, ${VEICULO_SELECT}, ${ENCARREGADO_SELECT}, ${MOTORISTA_SELECT}`;

export type OSInput = {
  numero?: string | null;
  obra_id: string;
  cliente_id?: string | null;
  pedido_omie?: string | null;
  data: string;
  hora_saida?: string | null;
  hora_chegada?: string | null;
  cidade?: string | null;
  veiculo_id?: string | null;
  encarregado_id?: string | null;
  motorista_id?: string | null;
  km_inicial?: number | null;
  km_final?: number | null;
  diaristas?: string | null;
  status: OSStatus;
  observacoes?: string | null;
  /** IDs de colaboradores da Equipe CLT (na ordem em que aparecem). */
  equipe?: string[];
};

function clean<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === "") (out as Record<string, unknown>)[k] = null;
  }
  return out;
}

/** Próximo número OS-AAAA-NNN do ano corrente. */
export async function proximoNumeroOS(): Promise<string> {
  const ano = new Date().getFullYear();
  const prefixo = `OS-${ano}-`;
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

export async function listOrdensServico(): Promise<OSListRow[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(LIST_SELECT)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[listOrdensServico]", error.message);
    return [];
  }
  return (data ?? []) as unknown as OSListRow[];
}

async function equipeDaOS(
  supabase: Awaited<ReturnType<typeof createClient>>,
  osId: string,
): Promise<OSEquipeMembro[]> {
  const { data, error } = await supabase
    .from("os_equipe")
    .select("id, colaborador_id, ordem, colaborador:colaboradores(nome_completo, cargo)")
    .eq("os_id", osId)
    .order("ordem", { ascending: true });
  if (error) {
    console.error("[equipeDaOS]", error.message);
    return [];
  }
  return (data ?? []).map((m) => {
    const row = m as unknown as {
      id: string;
      colaborador_id: string;
      ordem: number;
      colaborador: { nome_completo: string; cargo: string | null } | null;
    };
    return {
      id: row.id,
      colaborador_id: row.colaborador_id,
      ordem: row.ordem,
      nome_completo: row.colaborador?.nome_completo ?? "—",
      cargo: row.colaborador?.cargo ?? null,
    };
  });
}

export async function getOrdemServico(id: string): Promise<OSDetalhe | null> {
  if (!id || !hasSupabase()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(DETALHE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[getOrdemServico]", error.message);
    return null;
  }
  if (!data) return null;
  const os = data as unknown as OSDetalhe;
  os.equipe = await equipeDaOS(supabase, os.id);
  return os;
}

function dados(input: OSInput) {
  return clean({
    obra_id: input.obra_id || null,
    cliente_id: input.cliente_id || null,
    pedido_omie: input.pedido_omie ?? null,
    data: input.data,
    hora_saida: input.hora_saida || null,
    hora_chegada: input.hora_chegada || null,
    cidade: input.cidade ?? null,
    veiculo_id: input.veiculo_id || null,
    encarregado_id: input.encarregado_id || null,
    motorista_id: input.motorista_id || null,
    km_inicial: input.km_inicial ?? null,
    km_final: input.km_final ?? null,
    diaristas: input.diaristas ?? null,
    status: input.status,
    observacoes: input.observacoes ?? null,
  });
}

function validar(input: OSInput): string | null {
  if (!input.obra_id) return "Obra é obrigatória.";
  if (!input.data) return "Data é obrigatória.";
  return null;
}

/** Reescreve a equipe CLT da O.S (apaga e reinsere na ordem informada). */
async function sincronizarEquipe(
  supabase: Awaited<ReturnType<typeof createClient>>,
  osId: string,
  equipe: string[] | undefined,
) {
  await supabase.from("os_equipe").delete().eq("os_id", osId);
  const ids = (equipe ?? []).filter(Boolean);
  if (ids.length === 0) return;
  const rows = ids.map((colaborador_id, i) => ({
    os_id: osId,
    colaborador_id,
    ordem: i + 1,
  }));
  const { error } = await supabase.from("os_equipe").insert(rows);
  if (error) console.error("[sincronizarEquipe]", error.message);
}

export async function createOrdemServico(
  input: OSInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const erro = validar(input);
  if (erro) return { ok: false, error: erro };
  if (!hasSupabase()) return { ok: true, id: `os-${Date.now().toString(36)}` };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const numero =
      tentativa === 0 && input.numero?.trim()
        ? input.numero.trim()
        : await proximoNumeroOS();
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ ...dados(input), numero, user_id: user.id })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") continue;
      console.error("[createOrdemServico]", error.message);
      return { ok: false, error: error.message };
    }
    const osId = (data as { id: string }).id;
    await sincronizarEquipe(supabase, osId, input.equipe);
    revalidatePath(BASE_PATH);
    return { ok: true, id: osId };
  }
  return { ok: false, error: "Não foi possível gerar um número único. Tente novamente." };
}

export async function updateOrdemServico(
  id: string,
  input: OSInput,
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
      return { ok: false, error: "Já existe uma O.S com este número." };
    }
    console.error("[updateOrdemServico]", error.message);
    return { ok: false, error: error.message };
  }
  await sincronizarEquipe(supabase, id, input.equipe);
  revalidatePath(BASE_PATH);
  revalidatePath(`${BASE_PATH}/${id}`);
  revalidatePath(`${BASE_PATH}/${id}/editar`);
  return { ok: true };
}

export async function deleteOrdemServico(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[deleteOrdemServico]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  return { ok: true };
}
