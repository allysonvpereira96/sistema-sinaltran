"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { formatBRL } from "@/lib/format";
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
import type {
  ColaboradorAso,
  ColaboradorTreinamento,
  ColaboradorExperiencia,
  ColaboradorPeriodoAquisitivo,
  FeriasRiscoRow,
  VencimentoRow,
  TreinamentoCatalogo,
} from "@/lib/types/rh";
import { TREINAMENTOS_CATALOGO } from "@/lib/types/rh";

const TABLE = "colaboradores";
const BUCKET = "colaborador-documentos";

export type CentroCustoResumo = { id: string; nome: string };

/** Centros de custo ativos (id + nome) para selects/filtros. */
export async function listCentrosCusto(): Promise<CentroCustoResumo[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("centros_custo")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) {
    console.error("[listCentrosCusto]", error.message);
    return [];
  }
  return (data ?? []) as CentroCustoResumo[];
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
  empresa_id?: string | null;
  centro_custo_id?: string | null;
  status: Colaborador["status"];
  data_admissao: string;
  data_desligamento?: string | null;
  motivo_desligamento?: string | null;
  remuneracao_base?: number | null;
  ajuda_custo?: number | null;
  gratificacoes?: number | null;
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
  // Ficha de registro — filiação / dados civis
  nome_pai?: string | null;
  nome_mae?: string | null;
  estado_civil?: string | null;
  naturalidade?: string | null;
  naturalidade_uf?: string | null;
  nacionalidade?: string | null;
  raca_cor?: string | null;
  grau_instrucao?: string | null;
  // Ficha de registro — documentos trabalhistas
  ctps_numero?: string | null;
  ctps_serie?: string | null;
  titulo_eleitor?: string | null;
  cbo?: string | null;
  matricula_esocial?: string | null;
  // Ficha de registro — contratuais
  insalubridade_pct?: number | null;
  periculosidade_pct?: number | null;
  sindicato?: string | null;
  horario_trabalho?: string | null;
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

/**
 * Aplica uma atualização PARCIAL no colaborador — só os campos aprovados na
 * revisão da ficha — e adiciona os dependentes novos extraídos. Usado pelo
 * fluxo "Atualizar pela ficha".
 */
export async function atualizarColaboradorPelaFicha(
  id: string,
  patch: Partial<ColaboradorInput>,
  novosDependentes: { nome: string; parentesco?: string | null; data_nascimento?: string | null }[] = [],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "Colaborador não informado." };
  if (!hasSupabase()) return { ok: true };

  const supabase = await createClient();

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from(TABLE)
      .update(clean(patch as Record<string, unknown>))
      .eq("id", id);
    if (error) {
      console.error("[atualizarColaboradorPelaFicha]", error.message);
      return { ok: false, error: error.message };
    }
  }

  for (const dep of novosDependentes) {
    if (!dep.nome?.trim()) continue;
    const { error } = await supabase
      .from("colaborador_dependentes")
      .insert(clean({ colaborador_id: id, ...dep }));
    if (error) console.error("[atualizarColaboradorPelaFicha] dependente", error.message);
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

/**
 * Atualiza um gozo de férias existente. Aceita patch parcial — apenas os
 * campos enviados são alterados. Usado tanto pela edição inline do status
 * (passa só `status`) quanto pelo modal completo de edição.
 */
export async function updateFerias(
  id: string,
  patch: Partial<{
    periodo_aquisitivo_inicio: string | null;
    periodo_aquisitivo_fim: string | null;
    data_inicio: string;
    data_fim: string;
    dias: number;
    status: ColaboradorFerias["status"];
  }>,
  colaboradorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "ID obrigatório." };
  if (!hasSupabase()) return { ok: true };
  // Remove campos undefined antes de enviar (patch parcial)
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) updates[k] = v;
  }
  if (Object.keys(updates).length === 0) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase
    .from("colaborador_ferias")
    .update(clean(updates))
    .eq("id", id);
  if (error) {
    console.error("[updateFerias]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(`/pessoal/colaboradores/${colaboradorId}`);
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

// ── Períodos aquisitivos de férias (do relatório da contabilidade) ───────────

export async function listPeriodosAquisitivos(
  colaboradorId: string,
): Promise<ColaboradorPeriodoAquisitivo[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colaborador_periodos_aquisitivos")
    .select("*")
    .eq("colaborador_id", colaboradorId)
    .order("aquisitivo_inicio", { ascending: false });
  if (error) {
    console.error("[listPeriodosAquisitivos]", error.message);
    return [];
  }
  return (data ?? []) as ColaboradorPeriodoAquisitivo[];
}

export async function upsertPeriodoAquisitivo(input: {
  id?: string;
  colaborador_id: string;
  aquisitivo_inicio: string;
  aquisitivo_fim: string;
  dias_direito: number;
  concessivo_inicio?: string | null;
  concessivo_fim?: string | null;
  prazo_dobro?: string | null;
  observacoes?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.colaborador_id) return { ok: false, error: "Colaborador obrigatório." };
  if (!input.aquisitivo_inicio || !input.aquisitivo_fim)
    return { ok: false, error: "Período aquisitivo obrigatório." };
  if (input.dias_direito < 0)
    return { ok: false, error: "Dias de direito não pode ser negativo." };

  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const payload = {
    colaborador_id: input.colaborador_id,
    aquisitivo_inicio: input.aquisitivo_inicio,
    aquisitivo_fim: input.aquisitivo_fim,
    dias_direito: input.dias_direito,
    concessivo_inicio: input.concessivo_inicio ?? null,
    concessivo_fim: input.concessivo_fim ?? null,
    prazo_dobro: input.prazo_dobro ?? null,
    observacoes: input.observacoes?.trim() || null,
  };
  const { error } = input.id
    ? await supabase
        .from("colaborador_periodos_aquisitivos")
        .update(payload)
        .eq("id", input.id)
    : await supabase
        .from("colaborador_periodos_aquisitivos")
        .upsert(payload, {
          onConflict: "colaborador_id,aquisitivo_inicio,aquisitivo_fim",
        });

  if (error) {
    console.error("[upsertPeriodoAquisitivo]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(`/pessoal/colaboradores/${input.colaborador_id}`);
  revalidatePath("/pessoal/vencimentos");
  return { ok: true };
}

export async function deletePeriodoAquisitivo(
  id: string,
  colaboradorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase
    .from("colaborador_periodos_aquisitivos")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/pessoal/colaboradores/${colaboradorId}`);
  revalidatePath("/pessoal/vencimentos");
  return { ok: true };
}

/**
 * Lista os períodos aquisitivos em risco de pagamento em dobro,
 * ordenados pelos mais próximos do limite. Usado na página de Vencimentos.
 */
export async function listFeriasEmRisco(): Promise<FeriasRiscoRow[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vw_ferias_risco_dobra")
    .select("*")
    .order("dias_para_dobra", { ascending: true });
  if (error) {
    console.error("[listFeriasEmRisco]", error.message);
    return [];
  }
  return (data ?? []) as FeriasRiscoRow[];
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

/**
 * Registra um documento no DB cujo arquivo JÁ foi enviado para o Storage pelo
 * browser (upload direto via supabase-js client). Evita o limite de body
 * dos Server Actions do Next.js e elimina serialização desnecessária quando
 * vários arquivos são enviados em lote.
 *
 * Em caso de falha de DB, o arquivo é removido do bucket pra não deixar lixo.
 */
export async function registrarDocumento(input: {
  colaborador_id: string;
  tipo: string;
  descricao: string;
  arquivo_url: string;
  dias_atestado?: number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.colaborador_id) return { ok: false, error: "Colaborador não informado." };
  if (!input.arquivo_url) return { ok: false, error: "Arquivo não informado." };

  if (!hasSupabase()) return { ok: true };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dias =
    input.tipo === "atestado" && input.dias_atestado && input.dias_atestado > 0
      ? input.dias_atestado
      : null;

  const { error } = await supabase.from("colaborador_documentos").insert({
    colaborador_id: input.colaborador_id,
    tipo: input.tipo,
    descricao: input.descricao || "(sem nome)",
    arquivo_url: input.arquivo_url,
    dias_atestado: dias,
    uploaded_by: user?.id ?? null,
  });

  if (error) {
    console.error("[registrarDocumento]", error.message);
    // Limpa o arquivo do Storage pra não ficar lixo
    await supabase.storage.from(BUCKET).remove([input.arquivo_url]);
    return { ok: false, error: error.message };
  }

  revalidatePath(`/pessoal/colaboradores/${input.colaborador_id}`);
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
  observacoes?: string | null;
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
    .insert({
      colaborador_id: input.colaborador_id,
      tipo: input.tipo,
      descricao: input.descricao,
      data: input.data,
      observacoes: input.observacoes?.trim() || null,
      created_by: user?.id ?? null,
    });
  if (error) {
    console.error("[createOcorrencia]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(`/pessoal/colaboradores/${input.colaborador_id}`);
  revalidatePath(`/pessoal/caderno-virtual`);
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
  revalidatePath(`/pessoal/caderno-virtual`);
  return { ok: true };
}

/**
 * Movimentação com efeito: "Aumento de salário" ou "Troca de função".
 * Além de registrar a ocorrência (com os valores anterior/novo preservados),
 * altera o cadastro, lança no histórico e, na troca de função, cria um ASO
 * pendente (tipo "mudança de função") para ser preenchido depois.
 */
export async function registrarMovimentacao(input: {
  colaborador_id: string;
  tipo: "aumento_salario" | "troca_funcao";
  data: string;
  observacoes?: string | null;
  valor_novo?: number | null;
  funcao_nova?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.data) return { ok: false, error: "Data é obrigatória." };
  if (input.tipo === "aumento_salario" && (input.valor_novo == null || input.valor_novo < 0)) {
    return { ok: false, error: "Informe o novo salário." };
  }
  if (input.tipo === "troca_funcao" && !input.funcao_nova?.trim()) {
    return { ok: false, error: "Informe a nova função." };
  }
  if (!hasSupabase()) return { ok: true };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: atual } = await supabase
    .from(TABLE)
    .select("remuneracao_base, cargo")
    .eq("id", input.colaborador_id)
    .maybeSingle();

  const ocorrencia: Record<string, unknown> = {
    colaborador_id: input.colaborador_id,
    tipo: input.tipo,
    data: input.data,
    observacoes: input.observacoes?.trim() || null,
    created_by: user?.id ?? null,
  };

  if (input.tipo === "aumento_salario") {
    const anterior = (atual?.remuneracao_base as number | null) ?? null;
    const novo = input.valor_novo as number;
    ocorrencia.descricao = `Salário alterado de ${formatBRL(anterior)} para ${formatBRL(novo)}`;
    ocorrencia.valor_anterior = anterior;
    ocorrencia.valor_novo = novo;

    const { error: upErr } = await supabase
      .from(TABLE)
      .update({ remuneracao_base: novo })
      .eq("id", input.colaborador_id);
    if (upErr) {
      console.error("[registrarMovimentacao] salário", upErr.message);
      return { ok: false, error: upErr.message };
    }
    await supabase.from("colaborador_historico").insert({
      colaborador_id: input.colaborador_id,
      tipo: "alteracao_salarial",
      descricao: ocorrencia.descricao as string,
      data: input.data,
    });
  } else {
    const anterior = (atual?.cargo as string | null) ?? null;
    const nova = input.funcao_nova!.trim();
    ocorrencia.descricao = `Função alterada de ${anterior ?? "—"} para ${nova}`;
    ocorrencia.funcao_anterior = anterior;
    ocorrencia.funcao_nova = nova;

    const { error: upErr } = await supabase
      .from(TABLE)
      .update({ cargo: nova })
      .eq("id", input.colaborador_id);
    if (upErr) {
      console.error("[registrarMovimentacao] função", upErr.message);
      return { ok: false, error: upErr.message };
    }
    await supabase.from("colaborador_historico").insert({
      colaborador_id: input.colaborador_id,
      tipo: "promocao",
      descricao: ocorrencia.descricao as string,
      data: input.data,
    });
    // ASO pendente de mudança de função (sem data/resultado — preencher depois)
    await supabase.from("colaborador_aso").insert({
      colaborador_id: input.colaborador_id,
      tipo_exame: "mudanca_funcao",
      periodicidade_meses: 12,
      observacoes: `Gerado pela troca de função (${anterior ?? "—"} → ${nova}). Agendar exame.`,
      created_by: user?.id ?? null,
    });
  }

  const { error } = await supabase.from("colaborador_ocorrencias").insert(ocorrencia);
  if (error) {
    console.error("[registrarMovimentacao]", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath(`/pessoal/colaboradores/${input.colaborador_id}`);
  revalidatePath(`/pessoal/colaboradores/${input.colaborador_id}/editar`);
  revalidatePath("/pessoal/caderno-virtual");
  revalidatePath("/pessoal/vencimentos");
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

// ── ASO (exames ocupacionais) ─────────────────────────────────────────────────

export async function listAso(colaboradorId: string): Promise<ColaboradorAso[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colaborador_aso")
    .select("*")
    .eq("colaborador_id", colaboradorId)
    .order("data_realizacao", { ascending: false, nullsFirst: false });
  if (error) {
    console.error("[listAso]", error.message);
    return [];
  }
  return (data ?? []) as ColaboradorAso[];
}

export async function createAso(input: {
  colaborador_id: string;
  tipo_exame: string;
  data_realizacao: string;
  periodicidade_meses: number;
  resultado?: string | null;
  responsavel?: string | null;
  observacoes?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.data_realizacao) return { ok: false, error: "Informe a data de realização." };
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("colaborador_aso").insert(
    clean({
      ...input,
      periodicidade_meses: input.periodicidade_meses || 12,
      created_by: user?.id ?? null,
    }),
  );
  if (error) {
    console.error("[createAso]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(`/pessoal/colaboradores/${input.colaborador_id}`);
  revalidatePath("/pessoal/vencimentos");
  return { ok: true };
}

export async function deleteAso(
  id: string,
  colaboradorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("colaborador_aso").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/pessoal/colaboradores/${colaboradorId}`);
  revalidatePath("/pessoal/vencimentos");
  return { ok: true };
}

// ── Treinamentos (NRs, cursos) ────────────────────────────────────────────────

export async function listTreinamentos(colaboradorId: string): Promise<ColaboradorTreinamento[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colaborador_treinamentos")
    .select("*")
    .eq("colaborador_id", colaboradorId)
    .order("data_realizacao", { ascending: false, nullsFirst: false });
  if (error) {
    console.error("[listTreinamentos]", error.message);
    return [];
  }
  return (data ?? []) as ColaboradorTreinamento[];
}

export async function createTreinamento(input: {
  colaborador_id: string;
  treinamento: string;
  data_realizacao: string;
  validade_meses?: number | null;
  fornecedor_instrutor?: string | null;
  observacoes?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.treinamento?.trim()) return { ok: false, error: "Informe o treinamento/NR." };
  if (!input.data_realizacao) return { ok: false, error: "Informe a data de realização." };
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("colaborador_treinamentos").insert(
    clean({ ...input, created_by: user?.id ?? null }),
  );
  if (error) {
    console.error("[createTreinamento]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(`/pessoal/colaboradores/${input.colaborador_id}`);
  revalidatePath("/pessoal/vencimentos");
  return { ok: true };
}

export async function deleteTreinamento(
  id: string,
  colaboradorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("colaborador_treinamentos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/pessoal/colaboradores/${colaboradorId}`);
  revalidatePath("/pessoal/vencimentos");
  return { ok: true };
}

// ── Experiência (somente leitura por enquanto) ────────────────────────────────

export async function listExperiencia(colaboradorId: string): Promise<ColaboradorExperiencia[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("colaborador_experiencia")
    .select("*")
    .eq("colaborador_id", colaboradorId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[listExperiencia]", error.message);
    return [];
  }
  return (data ?? []) as ColaboradorExperiencia[];
}

// ── Painel de vencimentos (view unificada) ────────────────────────────────────

export async function listVencimentos(): Promise<VencimentoRow[]> {
  if (!hasSupabase()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vw_colaborador_vencimentos")
    .select("*")
    .order("dias_para_vencer", { ascending: true, nullsFirst: false });
  if (error) {
    console.error("[listVencimentos]", error.message);
    return [];
  }
  return (data ?? []) as VencimentoRow[];
}

// ── Catálogo de treinamentos (editável) ───────────────────────────────────────

/** Lista o catálogo. Cai na lista fixa do código se o banco não tiver dados. */
export async function listTreinamentosCatalogo(
  apenasAtivos = true,
): Promise<TreinamentoCatalogo[]> {
  const fallback: TreinamentoCatalogo[] = TREINAMENTOS_CATALOGO.map((i, idx) => ({
    id: `seed-${idx}`,
    nome: i.nome,
    validade_meses: i.validade_meses,
    ativo: true,
    created_at: "",
  }));
  if (!hasSupabase()) return fallback;

  const supabase = await createClient();
  let query = supabase.from("treinamentos_catalogo").select("*").order("nome", { ascending: true });
  if (apenasAtivos) query = query.eq("ativo", true);
  const { data, error } = await query;
  if (error) {
    console.error("[listTreinamentosCatalogo]", error.message);
    return fallback;
  }
  // Se a tabela existe mas está vazia, usa o fallback para não esvaziar o select.
  if (!data || data.length === 0) return apenasAtivos ? fallback : [];
  return data as TreinamentoCatalogo[];
}

export async function createTreinamentoCatalogo(input: {
  nome: string;
  validade_meses?: number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.nome?.trim()) return { ok: false, error: "Informe o nome do treinamento." };
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("treinamentos_catalogo").insert(
    clean({ nome: input.nome.trim(), validade_meses: input.validade_meses ?? null }),
  );
  if (error) {
    console.error("[createTreinamentoCatalogo]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath("/pessoal/treinamentos-catalogo");
  return { ok: true };
}

export async function updateTreinamentoCatalogo(
  id: string,
  input: { nome?: string; validade_meses?: number | null; ativo?: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.nome !== undefined) patch.nome = input.nome.trim();
  if (input.validade_meses !== undefined) patch.validade_meses = input.validade_meses;
  if (input.ativo !== undefined) patch.ativo = input.ativo;
  const { error } = await supabase.from("treinamentos_catalogo").update(patch).eq("id", id);
  if (error) {
    console.error("[updateTreinamentoCatalogo]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath("/pessoal/treinamentos-catalogo");
  return { ok: true };
}

export async function deleteTreinamentoCatalogo(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("treinamentos_catalogo").delete().eq("id", id);
  if (error) {
    console.error("[deleteTreinamentoCatalogo]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath("/pessoal/treinamentos-catalogo");
  return { ok: true };
}
