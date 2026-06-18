"use server";

import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import {
  COLABORADORES,
  COLABORADOR_OCORRENCIAS,
  type OcorrenciaTipo,
} from "@/lib/mocks/colaboradores";

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
