/**
 * Módulo de Compras (Procure-to-Pay) persistido no Supabase.
 * (Espelha as tabelas `public.compras_*` em 20260624000001_compras_almoxarifado.sql.)
 *
 * Fluxo do pedido:
 *   Solicitação → Triagem → Cotação → Aprovação → Compra → Entrega → Retirada
 */

export type CompraStatus =
  | "solicitacao"
  | "triagem"
  | "cotacao"
  | "aprovacao"
  | "compra"
  | "entrega"
  | "retirada"
  | "cancelado";

export type CompraPrioridade = "baixa" | "media" | "alta" | "urgente";

/** Etapas do fluxo, na ordem (sem `cancelado`) — usado na linha do tempo. */
export const COMPRA_STATUS_ORDER: Exclude<CompraStatus, "cancelado">[] = [
  "solicitacao",
  "triagem",
  "cotacao",
  "aprovacao",
  "compra",
  "entrega",
  "retirada",
];

export const COMPRA_STATUS_LABEL: Record<CompraStatus, string> = {
  solicitacao: "Solicitação",
  triagem: "Triagem",
  cotacao: "Cotação",
  aprovacao: "Aprovação",
  compra: "Compra",
  entrega: "Entrega",
  retirada: "Retirada",
  cancelado: "Cancelado",
};

export const COMPRA_STATUS_TONE: Record<
  CompraStatus,
  { bg: string; text: string; dot: string }
> = {
  solicitacao: { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" },
  triagem: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  cotacao: { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
  aprovacao: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  compra: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  entrega: { bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-500" },
  retirada: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelado: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
};

export const COMPRA_PRIORIDADE_LABEL: Record<CompraPrioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export const COMPRA_PRIORIDADE_TONE: Record<
  CompraPrioridade,
  { bg: string; text: string }
> = {
  baixa: { bg: "bg-slate-100", text: "text-slate-600" },
  media: { bg: "bg-sky-100", text: "text-sky-700" },
  alta: { bg: "bg-amber-100", text: "text-amber-700" },
  urgente: { bg: "bg-rose-100", text: "text-rose-700" },
};

/** Próxima etapa do fluxo (ou null se for terminal / cancelado). */
export function proximaEtapa(status: CompraStatus): CompraStatus | null {
  const i = COMPRA_STATUS_ORDER.indexOf(status as Exclude<CompraStatus, "cancelado">);
  if (i < 0 || i >= COMPRA_STATUS_ORDER.length - 1) return null;
  return COMPRA_STATUS_ORDER[i + 1];
}

// ── Linhas / tabelas ──────────────────────────────────────────────────────────

export type CompraPedidoRow = {
  id: string;
  numero: string;
  empresa_id: string | null;
  obra_id: string | null;
  solicitante_id: string | null;
  /** Nome de quem abriu o pedido (usuário logado) — snapshot. */
  solicitante_nome: string | null;
  prioridade: CompraPrioridade;
  status: CompraStatus;
  titulo: string;
  justificativa: string | null;
  data_solicitacao: string;
  data_limite: string | null;
  fornecedor_id: string | null;
  valor_estimado: number;
  valor_final: number;
  numero_nf: string | null;
  data_entrega: string | null;
  data_retirada: string | null;
  observacoes: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
};

type ObraEmbed = { numero: string; nome: string } | null;
type FornecedorEmbed = { nome: string; nome_fantasia: string | null } | null;
type SolicitanteEmbed = { nome_completo: string; cargo: string | null } | null;

/** Linha da listagem (com obra, fornecedor e solicitante embutidos). */
export type CompraPedidoListRow = CompraPedidoRow & {
  obra: ObraEmbed;
  fornecedor: FornecedorEmbed;
  solicitante: SolicitanteEmbed;
  itens_count: number;
};

export type CompraPedidoItem = {
  id: string;
  pedido_id: string;
  material_id: string | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_estimado_unit: number;
  qtd_estoque: number;
  qtd_comprar: number;
  observacoes: string | null;
  /** Saldo atual no almoxarifado (preenchido na triagem; null = texto livre). */
  saldo_estoque?: number | null;
};

export type CompraCotacao = {
  id: string;
  pedido_id: string;
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
  valor_total: number;
  prazo_entrega_dias: number | null;
  condicoes_pagamento: string | null;
  observacoes: string | null;
  selecionada: boolean;
  created_at: string;
};

export type CompraHistorico = {
  id: string;
  pedido_id: string;
  de_status: CompraStatus | null;
  para_status: CompraStatus;
  comentario: string | null;
  usuario_id: string | null;
  created_at: string;
};

/** Pedido completo para o detalhe. */
export type CompraPedidoDetalhe = CompraPedidoRow & {
  obra: ObraEmbed;
  fornecedor: FornecedorEmbed;
  solicitante: SolicitanteEmbed;
  itens: CompraPedidoItem[];
  cotacoes: CompraCotacao[];
  historico: CompraHistorico[];
};
