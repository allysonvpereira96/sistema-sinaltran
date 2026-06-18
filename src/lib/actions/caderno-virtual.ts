"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import {
  COLABORADORES,
  COLABORADOR_OCORRENCIAS,
  tipoTemPeriodo,
  type OcorrenciaTipo,
} from "@/lib/mocks/colaboradores";

const BUCKET = "colaborador-documentos";

/**
 * Adiciona N dias a uma data ISO (YYYY-MM-DD), retornando a nova data ISO.
 * Mantém a operação em UTC para não sofrer com fuso.
 */
function addDays(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}

/**
 * Ocorrência enriquecida com dados do colaborador — formato consumido pelo
 * calendário do Caderno Virtual e pelas exportações.
 */
export type OcorrenciaCaderno = {
  id: string;
  colaborador_id: string;
  colaborador_nome: string;
  colaborador_cargo: string | null;
  colaborador_setor: string | null;
  colaborador_matricula: string | null;
  tipo: OcorrenciaTipo;
  descricao: string;
  observacoes: string | null;
  data: string; // YYYY-MM-DD
  /** Para atestado/suspensão: nº de dias de afastamento. */
  dias_atestado: number | null;
  /** Último dia do período (data + dias_atestado - 1). */
  data_fim: string | null;
  /** Path do arquivo no bucket. */
  anexo_url: string | null;
  /** Nome original do arquivo enviado. */
  anexo_nome: string | null;
  created_at: string;
};

export type CadernoFiltros = {
  /** YYYY-MM-DD do primeiro dia do mês (UTC, sem hora). */
  inicio: string;
  /** YYYY-MM-DD do último dia do mês (UTC, sem hora). */
  fim: string;
  tipo?: OcorrenciaTipo | "todos";
  centroCustoId?: string | "todos";
};

/**
 * Lista ocorrências em um intervalo (mês), opcionalmente filtradas por tipo
 * e centro de custo, com join em `colaboradores` para trazer nome e cargo.
 *
 * Fallback: em dev sem Supabase, faz o filtro/join em memória sobre os mocks.
 */
export async function listOcorrenciasCaderno(
  filtros: CadernoFiltros,
): Promise<OcorrenciaCaderno[]> {
  const { inicio, fim, tipo, centroCustoId } = filtros;

  if (!hasSupabase()) {
    const byCol = new Map(COLABORADORES.map((c) => [c.id, c]));
    return COLABORADOR_OCORRENCIAS.filter((o) => {
      if (o.data < inicio || o.data > fim) return false;
      if (tipo && tipo !== "todos" && o.tipo !== tipo) return false;
      const col = byCol.get(o.colaborador_id);
      if (
        centroCustoId &&
        centroCustoId !== "todos" &&
        col?.centro_custo_id !== centroCustoId
      ) {
        return false;
      }
      return true;
    })
      .sort((a, b) => (a.data > b.data ? -1 : 1))
      .map((o) => {
        const col = byCol.get(o.colaborador_id);
        return {
          id: o.id,
          colaborador_id: o.colaborador_id,
          colaborador_nome: col?.nome_completo ?? "—",
          colaborador_cargo: col?.cargo ?? null,
          colaborador_setor: col?.setor ?? null,
          colaborador_matricula: col?.matricula ?? null,
          tipo: o.tipo,
          descricao: o.descricao,
          observacoes: o.observacoes ?? null,
          data: o.data,
          dias_atestado: o.dias_atestado ?? null,
          data_fim: o.data_fim ?? null,
          anexo_url: o.anexo_url ?? null,
          anexo_nome: o.anexo_nome ?? null,
          created_at: o.created_at,
        };
      });
  }

  const supabase = await createClient();

  let q = supabase
    .from("colaborador_ocorrencias")
    .select(
      `
        id,
        colaborador_id,
        tipo,
        descricao,
        observacoes,
        data,
        dias_atestado,
        data_fim,
        anexo_url,
        anexo_nome,
        created_at,
        colaboradores:colaboradores!colaborador_id (
          nome_completo,
          cargo,
          setor,
          matricula,
          centro_custo_id
        )
      `,
    )
    .gte("data", inicio)
    .lte("data", fim)
    .order("data", { ascending: false });

  if (tipo && tipo !== "todos") {
    q = q.eq("tipo", tipo);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[listOcorrenciasCaderno]", error.message);
    return [];
  }

  type ColaboradorEmbed = {
    nome_completo: string | null;
    cargo: string | null;
    setor: string | null;
    matricula: string | null;
    centro_custo_id: string | null;
  };
  type Row = {
    id: string;
    colaborador_id: string;
    tipo: OcorrenciaTipo;
    descricao: string | null;
    observacoes: string | null;
    data: string;
    dias_atestado: number | null;
    data_fim: string | null;
    anexo_url: string | null;
    anexo_nome: string | null;
    created_at: string;
    // PostgREST retorna o relacionamento como objeto (FK to-one) ou array.
    colaboradores: ColaboradorEmbed | ColaboradorEmbed[] | null;
  };

  let rows = ((data ?? []) as unknown as Row[]).map((row) => {
    const col = Array.isArray(row.colaboradores)
      ? row.colaboradores[0] ?? null
      : row.colaboradores;
    return {
      id: String(row.id),
      colaborador_id: String(row.colaborador_id),
      colaborador_nome: col?.nome_completo ?? "—",
      colaborador_cargo: col?.cargo ?? null,
      colaborador_setor: col?.setor ?? null,
      colaborador_matricula: col?.matricula ?? null,
      _centro_custo_id: col?.centro_custo_id ?? null,
      tipo: row.tipo,
      descricao: row.descricao ?? "",
      observacoes: row.observacoes ?? null,
      data: String(row.data),
      dias_atestado: row.dias_atestado ?? null,
      data_fim: row.data_fim ?? null,
      anexo_url: row.anexo_url ?? null,
      anexo_nome: row.anexo_nome ?? null,
      created_at: String(row.created_at),
    };
  });

  if (centroCustoId && centroCustoId !== "todos") {
    rows = rows.filter((r) => r._centro_custo_id === centroCustoId);
  }

  return rows.map(({ _centro_custo_id: _drop, ...rest }) => rest);
}

/**
 * Resumo simples do colaborador (para o select do modal de criação).
 */
export type ColaboradorResumo = {
  id: string;
  nome_completo: string;
  matricula: string | null;
  cargo: string | null;
  setor: string | null;
  centro_custo_id: string | null;
  status: "ativo" | "afastado" | "ferias" | "desligado";
};

/**
 * Lista colaboradores (apenas ativos por padrão) para o seletor do modal.
 */
export async function listColaboradoresParaCaderno(
  options?: { incluirInativos?: boolean },
): Promise<ColaboradorResumo[]> {
  const incluirInativos = options?.incluirInativos ?? false;

  if (!hasSupabase()) {
    return COLABORADORES.filter((c) => incluirInativos || c.status !== "desligado")
      .map((c) => ({
        id: c.id,
        nome_completo: c.nome_completo,
        matricula: c.matricula,
        cargo: c.cargo,
        setor: c.setor ?? null,
        centro_custo_id: c.centro_custo_id,
        status: c.status,
      }))
      .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
  }

  const supabase = await createClient();
  let q = supabase
    .from("colaboradores")
    .select("id, nome_completo, matricula, cargo, setor, centro_custo_id, status")
    .order("nome_completo", { ascending: true });

  if (!incluirInativos) q = q.neq("status", "desligado");

  const { data, error } = await q;
  if (error) {
    console.error("[listColaboradoresParaCaderno]", error.message);
    return [];
  }
  return (data ?? []) as ColaboradorResumo[];
}

/* ===========================================================================
 * Criação de ocorrência via Caderno Virtual.
 *
 * Padrão: o cliente faz upload do arquivo direto pro Supabase Storage via
 * supabase-js (browser client) e depois chama esta action passando apenas o
 * `anexo_url` (path). Evita o limite de body do Server Action (25 MB no
 * next.config) e mensagens genéricas "unexpected response" em arquivos grandes.
 * ======================================================================== */

export type CreateOcorrenciaInput = {
  colaborador_id: string;
  tipo: OcorrenciaTipo;
  descricao: string;
  observacoes?: string | null;
  data: string;
  dias_atestado?: number | null;
  /** Path do arquivo já enviado pelo cliente ao bucket. */
  anexo_url?: string | null;
  /** Nome original do arquivo (pra exibir). */
  anexo_nome?: string | null;
};

export async function createOcorrenciaCaderno(
  input: CreateOcorrenciaInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const colaboradorId = input.colaborador_id;
  const tipo = input.tipo;
  const descricao = (input.descricao ?? "").trim();
  const observacoes = (input.observacoes ?? "").trim();
  const data = input.data;

  if (!colaboradorId) return { ok: false, error: "Selecione um colaborador." };
  if (!descricao) return { ok: false, error: "Descrição é obrigatória." };
  if (!data) return { ok: false, error: "Data é obrigatória." };

  let dias: number | null = null;
  if (tipoTemPeriodo(tipo) && input.dias_atestado != null) {
    const n = Number(input.dias_atestado);
    if (!Number.isFinite(n) || n < 1) {
      return { ok: false, error: "Dias deve ser maior que zero." };
    }
    dias = Math.floor(n);
  }
  const dataFim = dias && dias > 1 ? addDays(data, dias - 1) : dias ? data : null;

  if (!hasSupabase()) return { ok: true };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("colaborador_ocorrencias").insert({
    colaborador_id: colaboradorId,
    tipo,
    descricao,
    observacoes: observacoes || null,
    data,
    dias_atestado: dias,
    data_fim: dataFim,
    anexo_url: input.anexo_url || null,
    anexo_nome: input.anexo_nome || null,
    created_by: user?.id ?? null,
  });

  if (error) {
    console.error("[createOcorrenciaCaderno] insert", error.message);
    // Se o registro falhou, limpa o arquivo do bucket pra não ficar lixo
    if (input.anexo_url) {
      await supabase.storage.from(BUCKET).remove([input.anexo_url]);
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/pessoal/caderno-virtual");
  revalidatePath(`/pessoal/colaboradores/${colaboradorId}`);
  return { ok: true };
}

/**
 * Exclui uma ocorrência (e o anexo, se existir).
 */
export async function deleteOcorrenciaCaderno(
  id: string,
  anexoUrl: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();

  if (anexoUrl) {
    await supabase.storage.from(BUCKET).remove([anexoUrl]);
  }

  const { error } = await supabase
    .from("colaborador_ocorrencias")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[deleteOcorrenciaCaderno]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath("/pessoal/caderno-virtual");
  return { ok: true };
}

/**
 * Gera uma URL assinada (60s) para download do anexo de uma ocorrência.
 */
export async function getAnexoOcorrenciaUrl(
  anexoUrl: string,
): Promise<string | null> {
  if (!hasSupabase()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(anexoUrl, 60);
  if (error) {
    console.error("[getAnexoOcorrenciaUrl]", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}
