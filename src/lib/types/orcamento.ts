/**
 * Orçamento e itens persistidos no Supabase.
 * (Espelham as tabelas `public.orcamentos` e `public.orcamento_itens`
 * definidas em 003_operacional.sql.)
 */

export type OrcamentoStatus =
  | "rascunho"
  | "enviado"
  | "aprovado"
  | "rejeitado"
  | "perdido";

export type OrcamentoItemRow = {
  id: string;
  orcamento_id: string;
  secao: string | null;
  ordem: number;
  material_id: string | null;
  servico_id: string | null;
  descricao: string;
  unidade_medida: string;
  quantidade: number;
  valor_unit_mao_obra: number;
  valor_unit_material: number;
  valor_total_mao_obra: number;
  valor_total_material: number;
  valor_total: number;
  observacoes: string | null;
  created_at: string;
};

export type OrcamentoRow = {
  id: string;
  numero: string;
  empresa_id: string | null;
  cliente_id: string | null;
  responsavel: string | null;
  descricao: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  engenheiro_responsavel: string | null;
  crea_engenheiro: string | null;
  prazo_execucao: string | null;
  condicoes_pagamento: string | null;
  valor_total: number;
  status: OrcamentoStatus;
  data_envio: string | null;
  data_validade: string | null;
  data_aprovacao: string | null;
  observacoes: string | null;
  obra_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
};

/** Resumo de cliente/empresa embutido (joins do PostgREST) para a listagem. */
export type OrcamentoListRow = OrcamentoRow & {
  cliente: {
    razao_social: string;
    nome_fantasia: string | null;
  } | null;
  empresa: { nome: string } | null;
};

/** Orçamento completo (dados + itens + relacionados) para detalhe/edição. */
export type OrcamentoDetalhe = OrcamentoRow & {
  cliente: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
    cnpj_cpf: string | null;
    responsavel: string | null;
  } | null;
  empresa: {
    id: string;
    nome: string;
    razao_social: string;
    cnpj: string | null;
    endereco: string | null;
    cidade: string | null;
    estado: string | null;
    telefone: string | null;
    email: string | null;
    responsavel_padrao: string | null;
  } | null;
  itens: OrcamentoItemRow[];
};

/** Item enviado pelo formulário (totais calculados no servidor). */
export type OrcamentoItemInput = {
  secao: string;
  material_id?: string | null;
  servico_id?: string | null;
  descricao: string;
  unidade_medida: string;
  quantidade: number;
  valor_unit_mao_obra: number;
  valor_unit_material: number;
  observacoes?: string | null;
};

/** Payload do formulário para criar/atualizar um orçamento. */
export type OrcamentoInput = {
  numero?: string | null;
  empresa_id: string;
  cliente_id: string;
  responsavel: string;
  descricao: string;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  engenheiro_responsavel?: string | null;
  crea_engenheiro?: string | null;
  prazo_execucao?: string | null;
  condicoes_pagamento?: string | null;
  status: OrcamentoStatus;
  data_envio?: string | null;
  data_validade?: string | null;
  observacoes?: string | null;
  itens: OrcamentoItemInput[];
};

export const ORCAMENTO_STATUS_LABEL: Record<OrcamentoStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  perdido: "Perdido",
};

export const ORCAMENTO_STATUS_TONE: Record<
  OrcamentoStatus,
  { bg: string; text: string; dot: string }
> = {
  rascunho: { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" },
  enviado: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  aprovado: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejeitado: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  perdido: { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-zinc-400" },
};
