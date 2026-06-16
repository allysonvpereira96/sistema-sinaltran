"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import {
  COLABORADORES,
  COLABORADOR_DOCUMENTOS,
  COLABORADOR_DEPENDENTES,
  COLABORADOR_FERIAS,
  COLABORADOR_HISTORICO,
  type Colaborador,
  type ColaboradorDocumento,
  type ColaboradorDependente,
  type ColaboradorFerias,
  type ColaboradorHistorico,
} from "@/lib/mocks/colaboradores";

const TABLE = "colaboradores";
const BUCKET = "colaborador-documentos";

export type ColaboradorInput = {
  nome_completo: string;
  matricula?: string | null;
  cpf?: string | null;
  rg?: string | null;
  data_nascimento?: string | null;
  genero?: string | null;
  pis?: string | null;
  cnh?: string | null;
  cnh_validade?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  cargo: string;
  obra_id?: string | null;
  status: Colaborador["status"];
  data_admissao: string;
  data_desligamento?: string | null;
  remuneracao_base?: number | null;
  ajuda_custo?: number | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  chave_pix?: string | null;
  emergencia_nome?: string | null;
  emergencia_parentesco?: string | null;
  emergencia_telefone?: string | null;
  observacoes?: string | null;
};

/** Normaliza strings vazias para null antes de persistir. */
function clean<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === "") (out as Record<string, unknown>)[k] = null;
  }
  return out;
}

// ── Colaboradores ─────────────────────────────────────────────────────────────

export async function listColaboradores(): Promise<Colaborador[]> {
  if (!hasSupabase()) return COLABORADORES;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("nome_completo", { ascending: true });
  if (error) {
    console.error("[listColaboradores]", error.message);
    return [];
  }
  return (data ?? []) as Colaborador[];
}

export async function getColaboradorById(id: string): Promise<Colaborador | null> {
  if (!id) return null;
  if (!hasSupabase()) return COLABORADORES.find((c) => c.id === id) ?? null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[getColaboradorById]", error.message);
    return null;
  }
  return data as Colaborador | null;
}

export async function createColaborador(
  input: ColaboradorInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!input.nome_completo?.trim()) return { ok: false, error: "Nome é obrigatório." };
  if (!input.cargo?.trim()) return { ok: false, error: "Cargo é obrigatório." };
  if (!input.data_admissao) return { ok: false, error: "Data de admissão é obrigatória." };

  if (!hasSupabase()) return { ok: true, id: `col-${COLABORADORES.length + 1}` };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert(clean({ ...input, ajuda_custo: input.ajuda_custo ?? 0 }))
    .select("id")
    .single();
  if (error) {
    console.error("[createColaborador]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath("/pessoal/colaboradores");
  return { ok: true, id: (data as { id: string }).id };
}

export async function updateColaborador(
  id: string,
  input: ColaboradorInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update(clean(input)).eq("id", id);
  if (error) {
    console.error("[updateColaborador]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath("/pessoal/colaboradores");
  revalidatePath(`/pessoal/colaboradores/${id}`);
  return { ok: true };
}

export async function deleteColaborador(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[deleteColaborador]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath("/pessoal/colaboradores");
  return { ok: true };
}

// ── Tabelas-filhas (leitura) ──────────────────────────────────────────────────

export async function listDependentes(colaboradorId: string): Promise<ColaboradorDependente[]> {
  if (!hasSupabase()) return COLABORADOR_DEPENDENTES.filter((d) => d.colaborador_id === colaboradorId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colaborador_dependentes")
    .select("*")
    .eq("colaborador_id", colaboradorId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[listDependentes]", error.message);
    return [];
  }
  return (data ?? []) as ColaboradorDependente[];
}

export async function listFerias(colaboradorId: string): Promise<ColaboradorFerias[]> {
  if (!hasSupabase()) return COLABORADOR_FERIAS.filter((f) => f.colaborador_id === colaboradorId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colaborador_ferias")
    .select("*")
    .eq("colaborador_id", colaboradorId)
    .order("data_inicio", { ascending: false });
  if (error) {
    console.error("[listFerias]", error.message);
    return [];
  }
  return (data ?? []) as ColaboradorFerias[];
}

export async function listHistorico(colaboradorId: string): Promise<ColaboradorHistorico[]> {
  if (!hasSupabase()) return COLABORADOR_HISTORICO.filter((h) => h.colaborador_id === colaboradorId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colaborador_historico")
    .select("*")
    .eq("colaborador_id", colaboradorId)
    .order("data", { ascending: false });
  if (error) {
    console.error("[listHistorico]", error.message);
    return [];
  }
  return (data ?? []) as ColaboradorHistorico[];
}

// ── Documentos (com upload no Storage) ────────────────────────────────────────

export async function listDocumentos(colaboradorId: string): Promise<ColaboradorDocumento[]> {
  if (!hasSupabase()) return COLABORADOR_DOCUMENTOS.filter((d) => d.colaborador_id === colaboradorId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colaborador_documentos")
    .select("*")
    .eq("colaborador_id", colaboradorId)
    .order("data_upload", { ascending: false });
  if (error) {
    console.error("[listDocumentos]", error.message);
    return [];
  }
  return (data ?? []) as ColaboradorDocumento[];
}

export async function uploadDocumento(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const colaboradorId = String(formData.get("colaborador_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "outros");
  const diasAtestadoRaw = formData.get("dias_atestado");
  const file = formData.get("file");

  if (!colaboradorId) return { ok: false, error: "Colaborador não informado." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Selecione um arquivo." };

  if (!hasSupabase()) return { ok: true };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${colaboradorId}/${tipo}/${Date.now()}_${safeName}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
  if (upErr) {
    console.error("[uploadDocumento] storage", upErr.message);
    return { ok: false, error: upErr.message };
  }

  const dias = diasAtestadoRaw ? Number(diasAtestadoRaw) : null;
  const { error: dbErr } = await supabase.from("colaborador_documentos").insert({
    colaborador_id: colaboradorId,
    tipo,
    descricao: file.name,
    arquivo_url: path,
    dias_atestado: tipo === "atestado" && dias ? dias : null,
    uploaded_by: user?.id ?? null,
  });
  if (dbErr) {
    console.error("[uploadDocumento] db", dbErr.message);
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, error: dbErr.message };
  }
  revalidatePath(`/pessoal/colaboradores/${colaboradorId}`);
  return { ok: true };
}

export async function deleteDocumento(
  id: string,
  arquivoUrl: string,
  colaboradorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([arquivoUrl]);
  const { error } = await supabase.from("colaborador_documentos").delete().eq("id", id);
  if (error) {
    console.error("[deleteDocumento]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(`/pessoal/colaboradores/${colaboradorId}`);
  return { ok: true };
}

/** Gera uma URL assinada (60s) para download de um documento privado. */
export async function getDocumentoUrl(arquivoUrl: string): Promise<string | null> {
  if (!hasSupabase()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(arquivoUrl, 60);
  if (error) {
    console.error("[getDocumentoUrl]", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}
