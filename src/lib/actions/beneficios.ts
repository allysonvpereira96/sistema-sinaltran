"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getEmpresaAtivaId } from "@/lib/actions/empresas";
import {
  VR_CONFIG_PADRAO,
  saldoSemana,
  semanaVazia,
  totalVrLinha,
  type VrConfig,
  type VrSemana,
} from "@/lib/beneficios/vr-calc";

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

// ── Combustível ───────────────────────────────────────────────────────────────

export type CombustivelConfig = { dias_uteis: number; valor_dia: number };

export type CombustivelLinha = {
  colaborador_id: string;
  nome: string;
  matricula: string | null;
  faltas: number;
  recebe: boolean;
  dias_trabalhados: number;
  observacao: string | null;
  lancado: boolean;
  assinado: boolean;
};

type Detalhes = { dias_uteis?: number; valor_dia?: number; dias_trabalhados?: number } | null;

export async function listCombustivelCompetencia(
  competencia: string,
): Promise<{ config: CombustivelConfig; linhas: CombustivelLinha[] }> {
  const config: CombustivelConfig = { dias_uteis: 21, valor_dia: 11 };
  if (!hasSupabase()) return { config, linhas: [] };
  const empresaId = await getEmpresaAtivaId();
  const supabase = await createClient();
  const { inicio, fim, primeiroDia } = mesRange(competencia);

  let colsQ = supabase
    .from("colaboradores")
    .select("id, nome_completo, matricula")
    .eq("status", "ativo")
    .order("nome_completo", { ascending: true });
  if (empresaId) colsQ = colsQ.eq("empresa_id", empresaId);
  const { data: cols } = await colsQ;

  const { data: fa } = await supabase.rpc("contar_faltas_atestados", { p_inicio: inicio, p_fim: fim });
  const faMap = new Map(((fa ?? []) as FaltasRow[]).map((r) => [r.colaborador_id, r]));

  let lancQ = supabase
    .from("beneficio_lancamentos")
    .select("colaborador_id, recebe, observacao, assinado, detalhes")
    .eq("tipo", "combustivel")
    .eq("competencia", primeiroDia);
  if (empresaId) lancQ = lancQ.eq("empresa_id", empresaId);
  const { data: lanc } = await lancQ;
  type LancRow = { colaborador_id: string; recebe: boolean; observacao: string | null; assinado: boolean; detalhes: Detalhes };
  const lancArr = (lanc ?? []) as LancRow[];
  const lancMap = new Map(lancArr.map((l) => [l.colaborador_id, l]));
  // config vem do primeiro lançamento salvo (mesma referência p/ todos)
  const prim = lancArr.find((l) => l.detalhes?.dias_uteis != null);
  if (prim?.detalhes) {
    config.dias_uteis = prim.detalhes.dias_uteis ?? 21;
    config.valor_dia = prim.detalhes.valor_dia ?? 11;
  }

  const linhas = ((cols ?? []) as { id: string; nome_completo: string; matricula: string | null }[]).map((c) => {
    const faltas = faMap.get(c.id)?.faltas ?? 0;
    const l = lancMap.get(c.id);
    return {
      colaborador_id: c.id,
      nome: c.nome_completo,
      matricula: c.matricula,
      faltas,
      recebe: l ? l.recebe : true,
      dias_trabalhados: l?.detalhes?.dias_trabalhados ?? config.dias_uteis - faltas,
      observacao: l?.observacao ?? null,
      lancado: !!l,
      assinado: l?.assinado ?? false,
    };
  });
  return { config, linhas };
}

export async function salvarCombustivel(
  competencia: string,
  config: CombustivelConfig,
  itens: { colaborador_id: string; recebe: boolean; dias_trabalhados: number; faltas: number; observacao?: string | null }[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const empresaId = await getEmpresaAtivaId();
  const supabase = await createClient();
  const { primeiroDia } = mesRange(competencia);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = itens.map((i) => {
    const total = i.recebe ? Math.max(0, i.dias_trabalhados * config.valor_dia) : 0;
    return {
      empresa_id: empresaId,
      tipo: "combustivel",
      competencia: primeiroDia,
      colaborador_id: i.colaborador_id,
      recebe: i.recebe,
      observacao: i.observacao?.trim() || null,
      faltas: i.faltas,
      valor_total: total,
      detalhes: { dias_uteis: config.dias_uteis, valor_dia: config.valor_dia, dias_trabalhados: i.dias_trabalhados },
      created_by: user?.id ?? null,
    };
  });
  const { error } = await supabase
    .from("beneficio_lancamentos")
    .upsert(rows, { onConflict: "empresa_id,tipo,competencia,colaborador_id" });
  if (error) {
    console.error("[salvarCombustivel]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath("/pessoal/beneficios/combustivel");
  return { ok: true };
}

export type ReciboCombustivel = {
  empregado: string;
  funcao: string;
  competencia: string;
  dias_trabalhados: number;
  valor_dia: number;
  total: number;
};

export async function getReciboCombustivel(colaboradorId: string, competencia: string): Promise<ReciboCombustivel | null> {
  if (!hasSupabase()) return null;
  const empresaId = await getEmpresaAtivaId();
  const supabase = await createClient();
  const { primeiroDia } = mesRange(competencia);
  const { data: col } = await supabase.from("colaboradores").select("nome_completo, cargo").eq("id", colaboradorId).maybeSingle();
  if (!col) return null;
  let q = supabase
    .from("beneficio_lancamentos")
    .select("valor_total, detalhes")
    .eq("tipo", "combustivel")
    .eq("competencia", primeiroDia)
    .eq("colaborador_id", colaboradorId);
  if (empresaId) q = q.eq("empresa_id", empresaId);
  const { data: l } = await q.maybeSingle();
  const det = (l?.detalhes ?? {}) as Detalhes;
  const [y, m] = competencia.split("-");
  return {
    empregado: (col as { nome_completo: string }).nome_completo,
    funcao: (col as { cargo: string }).cargo,
    competencia: `${m}/${y}`,
    dias_trabalhados: det?.dias_trabalhados ?? 0,
    valor_dia: det?.valor_dia ?? 0,
    total: Number(l?.valor_total ?? 0),
  };
}

// ── Vale-refeição / Alimentação (semanal, consolidado no mês) ───────────────────

export type VrLinha = {
  colaborador_id: string;
  nome: string;
  matricula: string | null;
  valor_dia_padrao: number;
  semanas: VrSemana[];
  total: number;
  lancado: boolean;
  assinado: boolean;
};

type VrDetalhes = { valor_dia_padrao?: number; semanas?: VrSemana[]; config?: Partial<VrConfig> } | null;

export async function listVrCompetencia(competencia: string): Promise<{ config: VrConfig; linhas: VrLinha[] }> {
  const config: VrConfig = { ...VR_CONFIG_PADRAO };
  if (!hasSupabase()) return { config, linhas: [] };
  const empresaId = await getEmpresaAtivaId();
  const supabase = await createClient();
  const { primeiroDia } = mesRange(competencia);

  let colsQ = supabase
    .from("colaboradores")
    .select("id, nome_completo, matricula")
    .eq("status", "ativo")
    .order("nome_completo", { ascending: true });
  if (empresaId) colsQ = colsQ.eq("empresa_id", empresaId);
  const { data: cols } = await colsQ;

  // lançamentos do mês atual
  let lancQ = supabase
    .from("beneficio_lancamentos")
    .select("colaborador_id, valor_total, assinado, detalhes")
    .eq("tipo", "alimentacao")
    .eq("competencia", primeiroDia);
  if (empresaId) lancQ = lancQ.eq("empresa_id", empresaId);
  const { data: lanc } = await lancQ;
  type LancRow = { colaborador_id: string; valor_total: number; assinado: boolean; detalhes: VrDetalhes };
  const lancArr = (lanc ?? []) as LancRow[];
  const lancMap = new Map(lancArr.map((l) => [l.colaborador_id, l]));
  const comCfg = lancArr.find((l) => l.detalhes?.config?.num_semanas != null);
  if (comCfg?.detalhes?.config) Object.assign(config, comCfg.detalhes.config);

  // padrão por colaborador: último mês anterior com lançamento
  let prevQ = supabase
    .from("beneficio_lancamentos")
    .select("colaborador_id, detalhes, competencia")
    .eq("tipo", "alimentacao")
    .lt("competencia", primeiroDia)
    .order("competencia", { ascending: false });
  if (empresaId) prevQ = prevQ.eq("empresa_id", empresaId);
  const { data: prev } = await prevQ;
  const padraoPrev = new Map<string, number>();
  for (const p of (prev ?? []) as { colaborador_id: string; detalhes: VrDetalhes }[]) {
    if (!padraoPrev.has(p.colaborador_id) && p.detalhes?.valor_dia_padrao != null) {
      padraoPrev.set(p.colaborador_id, p.detalhes.valor_dia_padrao);
    }
  }

  const linhas = ((cols ?? []) as { id: string; nome_completo: string; matricula: string | null }[]).map((c) => {
    const l = lancMap.get(c.id);
    const valorPadrao = l?.detalhes?.valor_dia_padrao ?? padraoPrev.get(c.id) ?? config.valor_dia_padrao_geral;
    let semanas = l?.detalhes?.semanas ?? [];
    // normaliza p/ num_semanas slots
    if (semanas.length < config.num_semanas) {
      semanas = [...semanas, ...Array.from({ length: config.num_semanas - semanas.length }, () => semanaVazia(valorPadrao))];
    } else if (semanas.length > config.num_semanas) {
      semanas = semanas.slice(0, config.num_semanas);
    }
    return {
      colaborador_id: c.id,
      nome: c.nome_completo,
      matricula: c.matricula,
      valor_dia_padrao: valorPadrao,
      semanas,
      total: l ? Number(l.valor_total) : totalVrLinha(semanas, config),
      lancado: !!l,
      assinado: l?.assinado ?? false,
    };
  });
  return { config, linhas };
}

export async function salvarVr(
  competencia: string,
  config: VrConfig,
  itens: { colaborador_id: string; valor_dia_padrao: number; semanas: VrSemana[] }[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const empresaId = await getEmpresaAtivaId();
  const supabase = await createClient();
  const { primeiroDia } = mesRange(competencia);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = itens.map((i) => {
    const total = totalVrLinha(i.semanas, config);
    const faltas = i.semanas.reduce((s, sem) => s + sem.faltas, 0);
    return {
      empresa_id: empresaId,
      tipo: "alimentacao",
      competencia: primeiroDia,
      colaborador_id: i.colaborador_id,
      recebe: total > 0,
      faltas,
      valor_total: total,
      detalhes: { valor_dia_padrao: i.valor_dia_padrao, semanas: i.semanas, config },
      created_by: user?.id ?? null,
    };
  });
  const { error } = await supabase
    .from("beneficio_lancamentos")
    .upsert(rows, { onConflict: "empresa_id,tipo,competencia,colaborador_id" });
  if (error) {
    console.error("[salvarVr]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath("/pessoal/beneficios/vale-refeicao");
  return { ok: true };
}

export type ReciboVr = {
  empregado: string;
  funcao: string;
  competencia: string;
  semanas: { label: string; saldo: number }[];
  total: number;
};

export async function getReciboVr(colaboradorId: string, competencia: string): Promise<ReciboVr | null> {
  if (!hasSupabase()) return null;
  const empresaId = await getEmpresaAtivaId();
  const supabase = await createClient();
  const { primeiroDia } = mesRange(competencia);
  const { data: col } = await supabase.from("colaboradores").select("nome_completo, cargo").eq("id", colaboradorId).maybeSingle();
  if (!col) return null;
  let q = supabase
    .from("beneficio_lancamentos")
    .select("valor_total, detalhes")
    .eq("tipo", "alimentacao")
    .eq("competencia", primeiroDia)
    .eq("colaborador_id", colaboradorId);
  if (empresaId) q = q.eq("empresa_id", empresaId);
  const { data: l } = await q.maybeSingle();
  const det = (l?.detalhes ?? {}) as VrDetalhes;
  const cfg: VrConfig = { ...VR_CONFIG_PADRAO, ...(det?.config ?? {}) };
  const semanas = det?.semanas ?? [];
  const [y, m] = competencia.split("-");
  return {
    empregado: (col as { nome_completo: string }).nome_completo,
    funcao: (col as { cargo: string }).cargo,
    competencia: `${m}/${y}`,
    semanas: semanas
      .map((s, i) => ({ idx: i + 1, s }))
      .filter(({ s }) => s.dias > 0 || s.extra_almoco_janta > 0 || s.extra_lanche > 0 || s.extra_viagem > 0)
      .map(({ idx, s }) => ({
        label: `Semana ${idx}${s.em_viagem ? " (viagem)" : ""} — ${Math.max(0, s.dias - s.faltas)} dia(s) × ${brlNum(s.valor_dia)}`,
        saldo: saldoSemana(s, cfg),
      })),
    total: Number(l?.valor_total ?? 0),
  };
}

function brlNum(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
