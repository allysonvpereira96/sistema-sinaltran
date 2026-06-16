/**
 * Classificação de vencimentos (ASO, treinamentos, etc.) por antecedência.
 * Limiares definidos com o DP: "atenção" a 60 dias, "urgente" a 30 dias.
 */

export const ALERTA_ATENCAO_DIAS = 60;
export const ALERTA_URGENTE_DIAS = 30;

export type VencStatus = "vencido" | "urgente" | "atencao" | "ok" | "sem_data";

/** Dias entre hoje e a data de vencimento (negativo = já venceu). */
export function diasAteVencimento(vencimento: string | null | undefined): number | null {
  if (!vencimento) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(`${vencimento}T00:00:00`);
  if (Number.isNaN(venc.getTime())) return null;
  return Math.round((venc.getTime() - hoje.getTime()) / 86_400_000);
}

/** Classifica a partir do nº de dias (já calculado, ex.: vindo da view). */
export function classificarDias(dias: number | null | undefined): VencStatus {
  if (dias == null) return "sem_data";
  if (dias < 0) return "vencido";
  if (dias <= ALERTA_URGENTE_DIAS) return "urgente";
  if (dias <= ALERTA_ATENCAO_DIAS) return "atencao";
  return "ok";
}

/** Classifica a partir da data de vencimento. */
export function classificarVencimento(vencimento: string | null | undefined): VencStatus {
  return classificarDias(diasAteVencimento(vencimento));
}

export const VENC_LABEL: Record<VencStatus, string> = {
  vencido: "Vencido",
  urgente: "Vence em breve",
  atencao: "Atenção",
  ok: "Em dia",
  sem_data: "Sem data",
};

export const VENC_TONE: Record<VencStatus, { bg: string; text: string; dot: string }> = {
  vencido: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  urgente: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  atencao: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  ok: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  sem_data: { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" },
};

/** Texto curto do prazo, ex.: "vence em 12 dias", "venceu há 3 dias". */
export function prazoLabel(dias: number | null | undefined): string {
  if (dias == null) return "—";
  if (dias < 0) return `venceu há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "dia" : "dias"}`;
  if (dias === 0) return "vence hoje";
  return `vence em ${dias} ${dias === 1 ? "dia" : "dias"}`;
}
