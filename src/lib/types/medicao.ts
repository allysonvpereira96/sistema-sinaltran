/**
 * Medição (boletim) persistida no Supabase.
 * (Tabela `public.medicoes` — base em 003, estendida em 006_medicoes_recebivel.)
 * Cada medição aprovada e sem data_recebimento é uma conta a receber.
 */
export type MedicaoStatus = "rascunho" | "enviada" | "aprovada" | "rejeitada";

export type MedicaoRow = {
  id: string;
  obra_id: string;
  numero: number;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
  percentual_executado: number;
  status: MedicaoStatus;
  observacoes: string | null;
  data_envio: string | null;
  data_aprovacao: string | null;
  data_previsao_recebimento: string | null;
  data_recebimento: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
};

type ObraEmbed = {
  id: string;
  numero: string;
  nome: string;
  valor_total: number;
  responsavel: string | null;
  cliente: {
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
} | null;

export type MedicaoListRow = MedicaoRow & { obra: ObraEmbed };

export type MedicaoDetalhe = MedicaoRow & {
  obra: ObraEmbed;
  /** valor já medido na obra (soma das medições não rejeitadas). */
  obra_valor_medido: number;
  /** outras medições da mesma obra. */
  outras: MedicaoRow[];
};

export const MEDICAO_STATUS_LABEL: Record<MedicaoStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};

export const MEDICAO_STATUS_TONE: Record<
  MedicaoStatus,
  { bg: string; text: string; dot: string }
> = {
  rascunho: { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" },
  enviada: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  aprovada: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejeitada: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
};
