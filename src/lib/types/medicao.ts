/**
 * Medição (boletim) persistida no Supabase.
 * (Tabela `public.medicoes` — base em 003, estendida em 006_medicoes_recebivel
 *  e 20260630000001_medicoes_faturamento.)
 * Cada medição aprovada e sem data_recebimento é uma conta a receber.
 */
export type MedicaoStatus = "rascunho" | "enviada" | "aprovada" | "rejeitada";

/** Forma de recebimento do título faturado. */
export type FormaRecebimento =
  | "boleto"
  | "transferencia"
  | "pix"
  | "cheque"
  | "dinheiro";

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
  // Faturamento (etapa entre aprovação e recebimento).
  data_faturamento: string | null;
  numero_nf: string | null;
  data_vencimento: string | null;
  forma_recebimento: FormaRecebimento | null;
  /** Valor efetivamente recebido na baixa (permite recebimento parcial). */
  valor_recebido: number | null;
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

export const FORMA_RECEBIMENTO_LABEL: Record<FormaRecebimento, string> = {
  boleto: "Boleto",
  transferencia: "Transferência",
  pix: "PIX",
  cheque: "Cheque",
  dinheiro: "Dinheiro",
};

/**
 * Situação do recebível — derivada do status de aprovação + datas.
 * Não é uma coluna: é calculada para exibição e filtros.
 *  rascunho/enviada/rejeitada → espelham o status de aprovação;
 *  a_receber → aprovada, faturada ou não, ainda sem baixa e dentro do prazo;
 *  vencida   → a_receber com data_vencimento já passada;
 *  recebida  → tem data_recebimento.
 */
export type MedicaoSituacao =
  | "rascunho"
  | "enviada"
  | "rejeitada"
  | "a_receber"
  | "vencida"
  | "recebida";

type MedicaoLike = Pick<
  MedicaoRow,
  "status" | "data_recebimento" | "data_vencimento"
>;

const hojeISO = () => new Date().toISOString().slice(0, 10);

/** Situação do recebível para a data informada (default = hoje). */
export function medicaoSituacao(m: MedicaoLike, hoje = hojeISO()): MedicaoSituacao {
  if (m.data_recebimento) return "recebida";
  if (m.status === "rascunho") return "rascunho";
  if (m.status === "enviada") return "enviada";
  if (m.status === "rejeitada") return "rejeitada";
  // aprovada, sem baixa:
  if (m.data_vencimento && m.data_vencimento < hoje) return "vencida";
  return "a_receber";
}

/** Foi faturada (NFS-e emitida ou faturamento registrado). */
export function medicaoFaturada(
  m: Pick<MedicaoRow, "data_faturamento" | "numero_nf">,
): boolean {
  return !!(m.data_faturamento || m.numero_nf);
}

export const MEDICAO_SITUACAO_LABEL: Record<MedicaoSituacao, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  rejeitada: "Rejeitada",
  a_receber: "A receber",
  vencida: "Vencida",
  recebida: "Recebida",
};

export const MEDICAO_SITUACAO_TONE: Record<
  MedicaoSituacao,
  { bg: string; text: string; dot: string }
> = {
  rascunho: { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" },
  enviada: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  rejeitada: { bg: "bg-zinc-100", text: "text-zinc-500", dot: "bg-zinc-400" },
  a_receber: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  vencida: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  recebida: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};
