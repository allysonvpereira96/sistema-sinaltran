/**
 * Obra persistida no Supabase.
 * (Espelha a tabela `public.obras` definida em 003_operacional.sql.)
 */
export type ObraStatus =
  | "planejamento"
  | "em_andamento"
  | "pausada"
  | "concluida"
  | "cancelada";

export type ObraRow = {
  id: string;
  numero: string;
  empresa_id: string | null;
  cliente_id: string | null;
  orcamento_id: string | null;
  nome: string;
  responsavel: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  valor_total: number;
  mao_obra_direta: number;
  mao_obra_indireta: number;
  status: ObraStatus;
  data_inicio: string | null;
  data_fim_prevista: string | null;
  data_fim_real: string | null;
  observacoes: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
};

type ClienteEmbed = {
  razao_social: string;
  nome_fantasia: string | null;
  cnpj_cpf: string | null;
  responsavel: string | null;
  cidade: string | null;
  estado: string | null;
} | null;

/** Linha da listagem (com cliente e valor já medido). */
export type ObraListRow = ObraRow & {
  cliente: ClienteEmbed;
  valor_medido: number;
};

/** Obra completa para o detalhe. */
export type ObraDetalhe = ObraRow & {
  cliente: ClienteEmbed;
  valor_medido: number;
};

export const OBRA_STATUS_LABEL: Record<ObraStatus, string> = {
  planejamento: "Planejamento",
  em_andamento: "Em andamento",
  pausada: "Pausada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const OBRA_STATUS_TONE: Record<
  ObraStatus,
  { bg: string; text: string; dot: string }
> = {
  planejamento: { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" },
  em_andamento: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  pausada: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  concluida: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelada: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
};

/** Saldo e percentual executado a partir do valor medido. */
export function calcularSaldo(valorTotal: number, valorMedido: number) {
  const saldo_restante = Math.max(0, valorTotal - valorMedido);
  const percentual_executado = valorTotal ? (valorMedido / valorTotal) * 100 : 0;
  return {
    saldo_restante,
    percentual_executado,
    percentual_restante: 100 - percentual_executado,
  };
}
