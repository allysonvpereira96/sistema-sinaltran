"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getEmpresaAtivaId } from "@/lib/actions/empresas";

/** "YYYY-MM" → intervalo do mês + 1º dia (para a coluna competencia). */
function mesRange(competencia: string) {
  const [y, m] = competencia.split("-").map(Number);
  const inicio = `${y}-${String(m).padStart(2, "0")}-01`;
  const fim = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { inicio, fim, primeiroDia: inicio };
}

type FaltasRow = { colaborador_id: string; faltas: number; atestados: number };

// ── Cesta básica ──────────────────────────────────────────────────────────────

export type CestaLinha = {
  colaborador_id: string;
  nome: string;
  matricula: string | null;
  admissao: string;
  recebe: boolean;
  observacao: string | null;
  faltas: number;
  atestados: number;
  /** Regra: perde a cesta quem teve falta OU 2+ atestados no mês. */
  perde_regra: boolean;
  lancado: boolean;
  assinado: boolean;
};

/**
 * Lista a competência da cesta para a empresa ativa: colaboradores ativos +
 * faltas/atestados do mês (do caderno) + lançamento existente, com a sugestão
 * automática de quem perde.
 */
export async function listCestaCompetencia(competencia: string): Promise<CestaLinha[]> {
  if (!hasSupabase()) return [];
  const empresaId = await getEmpresaAtivaId();
  const supabase = await createClient();
  const { inicio, fim, primeiroDia } = mesRange(competencia);

  let colsQ = supabase
    .from("colaboradores")
    .select("id, nome_completo, matricula, data_admissao")
    .eq("status", "ativo")
    .order("nome_completo", { ascending: true });
  if (empresaId) colsQ = colsQ.eq("empresa_id", empresaId);
  const { data: cols } = await colsQ;

  const { data: fa } = await supabase.rpc("contar_faltas_atestados", { p_inicio: inicio, p_fim: fim });
  const faMap = new Map(((fa ?? []) as FaltasRow[]).map((r) => [r.colaborador_id, r]));

  let lancQ = supabase
    .from("beneficio_lancamentos")
    .select("colaborador_id, recebe, observacao, assinado")
    .eq("tipo", "cesta")
    .eq("competencia", primeiroDia);
  if (empresaId) lancQ = lancQ.eq("empresa_id", empresaId);
  const { data: lanc } = await lancQ;
  const lancMap = new Map(
    ((lanc ?? []) as { colaborador_id: string; recebe: boolean; observacao: string | null; assinado: boolean }[]).map((l) => [l.colaborador_id, l]),
  );

  return ((cols ?? []) as { id: string; nome_completo: string; matricula: string | null; data_admissao: string }[]).map((c) => {
    const f = faMap.get(c.id);
    const faltas = f?.faltas ?? 0;
    const atestados = f?.atestados ?? 0;
    const perde = faltas >= 1 || atestados >= 2;
    const l = lancMap.get(c.id);
    const motivoAuto = atestados >= 2 ? "2+ atestados no mês" : faltas >= 1 ? "Falta no mês" : null;
    return {
      colaborador_id: c.id,
      nome: c.nome_completo,
      matricula: c.matricula,
      admissao: c.data_admissao,
      recebe: l ? l.recebe : !perde,
      observacao: l ? l.observacao : perde ? motivoAuto : null,
      faltas,
      atestados,
      perde_regra: perde,
      lancado: !!l,
      assinado: l?.assinado ?? false,
    };
  });
}

export async function salvarCesta(
  competencia: string,
  itens: { colaborador_id: string; recebe: boolean; observacao?: string | null; faltas: number; atestados: number }[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const empresaId = await getEmpresaAtivaId();
  const supabase = await createClient();
  const { primeiroDia } = mesRange(competencia);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = itens.map((i) => ({
    empresa_id: empresaId,
    tipo: "cesta",
    competencia: primeiroDia,
    colaborador_id: i.colaborador_id,
    recebe: i.recebe,
    observacao: i.observacao?.trim() || null,
    faltas: i.faltas,
    atestados: i.atestados,
    valor_total: 0,
    created_by: user?.id ?? null,
  }));
  const { error } = await supabase
    .from("beneficio_lancamentos")
    .upsert(rows, { onConflict: "empresa_id,tipo,competencia,colaborador_id" });
  if (error) {
    console.error("[salvarCesta]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath("/pessoal/beneficios/cesta");
  return { ok: true };
}

// ── Recibo (PDF) ──────────────────────────────────────────────────────────────

export type ReciboBeneficio = {
  empregado: string;
  funcao: string;
  competencia: string; // MM/AAAA
  recebe: boolean;
  observacao: string | null;
};

/** Dados do recibo de cesta de um colaborador na competência (empresa ativa). */
export async function getReciboCesta(colaboradorId: string, competencia: string): Promise<ReciboBeneficio | null> {
  if (!hasSupabase()) return null;
  const empresaId = await getEmpresaAtivaId();
  const supabase = await createClient();
  const { primeiroDia } = mesRange(competencia);
  const { data: col } = await supabase
    .from("colaboradores")
    .select("nome_completo, cargo")
    .eq("id", colaboradorId)
    .maybeSingle();
  if (!col) return null;
  let q = supabase
    .from("beneficio_lancamentos")
    .select("recebe, observacao")
    .eq("tipo", "cesta")
    .eq("competencia", primeiroDia)
    .eq("colaborador_id", colaboradorId);
  if (empresaId) q = q.eq("empresa_id", empresaId);
  const { data: l } = await q.maybeSingle();
  const [y, m] = competencia.split("-");
  return {
    empregado: (col as { nome_completo: string }).nome_completo,
    funcao: (col as { cargo: string }).cargo,
    competencia: `${m}/${y}`,
    recebe: l?.recebe ?? true,
    observacao: l?.observacao ?? null,
  };
}
