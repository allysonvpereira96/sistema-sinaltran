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
  COLABORADOR_COMENTARIOS,
  COLABORADOR_OCORRENCIAS,
  COLABORADOR_AVALIACOES,
  type Colaborador,
  type ColaboradorDocumento,
  type ColaboradorDependente,
  type ColaboradorFerias,
  type ColaboradorHistorico,
  type ColaboradorComentario,
  type ColaboradorOcorrencia,
  type ColaboradorAvaliacao,
} from "@/lib/mocks/colaboradores";

const TABLE = "colaboradores";
const BUCKET = "colaborador-documentos";

export type ObraResumo = { id: string; nome: string };

/** Obras (id + nome) para selects/filtros. Lê a tabela real; mock no fallback. */
export async function listObrasResumo(): Promise<ObraResumo[]> {
  if (!hasSupabase()) {
    const { OBRAS } = await import("@/lib/mocks/obras");
    return OBRAS.map((o) => ({ id: o.id, nome: o.nome }));
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obras")
    .select("id, nome")
    .order("nome", { ascending: true });
  if (error) {
    console.error("[listObrasResumo]", error.message);
    return [];
  }
  return (data ?? []) as ObraResumo[];
}

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
  termo_uso_imagem?: boolean;
  termo_uso_imagem_data?: string | null;
  manual_conduta?: boolean;
  manual_conduta_data?: string | null;
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
  const novoId = (data as { id: string }).id;
  await supabase.from("colaborador_historico").insert({
    colaborador_id: novoId,
    tipo: "admissao",
    descricao: `Admitido como ${input.cargo}`,
    data: input.data_admissao,
  });
  revalidatePath("/pessoal/colaboradores");
  return { ok: true, id: novoId };
}

export async function updateColaborador(
  id: string,
  input: ColaboradorInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };

  const supabase = await createClient();

  // estado anterior, para registrar histórico das mudanças relevantes
  const { data: antes } = await supabase
    .from(TABLE)
    .select("cargo, remuneracao_base, status")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from(TABLE).update(clean(input)).eq("id", id);
  if (error) {
    console.error("[updateColaborador]", error.message);
    return { ok: false, error: error.message };
  }

  if (antes) {
    const hoje = new Date().toISOString().slice(0, 10);
    const entradas: { colaborador_id: string; tipo: string; descricao: string; data: string }[] = [];
    if (antes.cargo !== input.cargo) {
      entradas.push({ colaborador_id: id, tipo: "promocao", descricao: `Cargo alterado: ${antes.cargo} → ${input.cargo}`, data: hoje });
    }
    if ((antes.remuneracao_base ?? null) !== (input.remuneracao_base ?? null)) {
      entradas.push({ colaborador_id: id, tipo: "alteracao_salarial", descricao: `Remuneração base alterada para R$ ${(input.remuneracao_base ?? 0).toFixed(2)}`, data: hoje });
    }
    if (antes.status !== input.status) {
      const tipo = input.status === "desligado" ? "desligamento" : input.status === "afastado" ? "afastamento" : "transferencia";
      entradas.push({ colaborador_id: id, tipo, descricao: `Status alterado: ${antes.status} → ${input.status}`, data: hoje });
    }
    if (entradas.length) await supabase.from("colaborador_historico").insert(entradas);
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

export async function createDependente(input: {
  colaborador_id: string;
  nome: string;
  parentesco?: string | null;
  data_nascimento?: string | null;
  cpf?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.nome?.trim()) return { ok: false, error: "Nome é obrigatório." };
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("colaborador_dependentes").insert(clean(input));
  if (error) {
    console.error("[createDependente]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(`/pessoal/colaboradores/${input.colaborador_id}`);
  return { ok: true };
}

export async function deleteDependente(
  id: string,
  colaboradorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("colaborador_dependentes").delete().eq("id", id);
  if (error) {
    console.error("[deleteDependente]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(`/pessoal/colaboradores/${colaboradorId}`);
  return { ok: true };
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

export async function createFerias(input: {
  colaborador_id: string;
  periodo_aquisitivo_inicio?: string | null;
  periodo_aquisitivo_fim?: string | null;
  data_inicio: string;
  data_fim: string;
  dias: number;
  status: ColaboradorFerias["status"];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.data_inicio || !input.data_fim) {
    return { ok: false, error: "Datas de início e fim são obrigatórias." };
  }
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("colaborador_ferias").insert(clean(input));
  if (error) {
    console.error("[createFerias]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(`/pessoal/colaboradores/${input.colaborador_id}`);
  return { ok: true };
}

export async function deleteFerias(
  id: string,
  colaboradorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("colaborador_ferias").delete().eq("id", id);
  if (error) {
    console.error("[deleteFerias]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(`/pessoal/colaboradores/${colaboradorId}`);
  return { ok: true };
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

// ── Comentários ───────────────────────────────────────────────────────────────

export async function listComentarios(colaboradorId: string): Promise<ColaboradorComentario[]> {
  if (!hasSupabase()) return COLABORADOR_COMENTARIOS.filter((x) => x.colaborador_id === colaboradorId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colaborador_comentarios")
    .select("*")
    .eq("colaborador_id", colaboradorId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[listComentarios]", error.message);
    return [];
  }
  return (data ?? []) as ColaboradorComentario[];
}

export async function createComentario(
  colaboradorId: string,
  comentario: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!comentario.trim()) return { ok: false, error: "Comentário vazio." };
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("colaborador_comentarios").insert({
    colaborador_id: colaboradorId,
    comentario: comentario.trim(),
    created_by: user?.id ?? null,
  });
  if (error) {
    console.error("[createComentario]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(`/pessoal/colaboradores/${colaboradorId}`);
  return { ok: true };
}

export async function deleteComentario(
  id: string,
  colaboradorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("colaborador_comentarios").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/pessoal/colaboradores/${colaboradorId}`);
  return { ok: true };
}

// ── Ocorrências ────────────────────────────────────────────────────────────────

export async function listOcorrencias(colaboradorId: string): Promise<ColaboradorOcorrencia[]> {
  if (!hasSupabase()) return COLABORADOR_OCORRENCIAS.filter((x) => x.colaborador_id === colaboradorId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colaborador_ocorrencias")
    .select("*")
    .eq("colaborador_id", colaboradorId)
    .order("data", { ascending: false });
  if (error) {
    console.error("[listOcorrencias]", error.message);
    return [];
  }
  return (data ?? []) as ColaboradorOcorrencia[];
}

export async function createOcorrencia(input: {
  colaborador_id: string;
  tipo: ColaboradorOcorrencia["tipo"];
  descricao: string;
  data: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.descricao.trim()) return { ok: false, error: "Descrição é obrigatória." };
  if (!input.data) return { ok: false, error: "Data é obrigatória." };
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("colaborador_ocorrencias")
    .insert({ ...input, created_by: user?.id ?? null });
  if (error) {
    console.error("[createOcorrencia]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(`/pessoal/colaboradores/${input.colaborador_id}`);
  return { ok: true };
}

export async function deleteOcorrencia(
  id: string,
  colaboradorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("colaborador_ocorrencias").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/pessoal/colaboradores/${colaboradorId}`);
  return { ok: true };
}

// ── Avaliações ─────────────────────────────────────────────────────────────────

export async function listAvaliacoes(colaboradorId: string): Promise<ColaboradorAvaliacao[]> {
  if (!hasSupabase()) return COLABORADOR_AVALIACOES.filter((x) => x.colaborador_id === colaboradorId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colaborador_avaliacoes")
    .select("*")
    .eq("colaborador_id", colaboradorId)
    .order("data", { ascending: false });
  if (error) {
    console.error("[listAvaliacoes]", error.message);
    return [];
  }
  return (data ?? []) as ColaboradorAvaliacao[];
}

export async function createAvaliacao(input: {
  colaborador_id: string;
  data: string;
  periodo?: string | null;
  nota?: number | null;
  avaliador?: string | null;
  pontos_fortes?: string | null;
  pontos_melhorar?: string | null;
  observacoes?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.data) return { ok: false, error: "Data é obrigatória." };
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("colaborador_avaliacoes")
    .insert(clean({ ...input, created_by: user?.id ?? null }));
  if (error) {
    console.error("[createAvaliacao]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(`/pessoal/colaboradores/${input.colaborador_id}`);
  return { ok: true };
}

export async function deleteAvaliacao(
  id: string,
  colaboradorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("colaborador_avaliacoes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/pessoal/colaboradores/${colaboradorId}`);
  return { ok: true };
}
