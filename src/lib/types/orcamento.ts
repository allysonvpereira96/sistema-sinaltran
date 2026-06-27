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
  bloco_id: string | null;
  secao: string | null;
  ordem: number;
  material_id: string | null;
  servico_id: string | null;
  codigo_omie: string | null;
  ncm: string | null;
  descricao: string;
  unidade_medida: string;
  quantidade: number;
  valor_unit_mao_obra: number;
  valor_unit_material: number;
  valor_total_mao_obra: number;
  valor_total_material: number;
  valor_desconto: number;
  valor_total: number;
  observacoes: string | null;
  created_at: string;
};

/** Bloco fiscal do orçamento (espelha um documento do Omie). */
export type OrcamentoBlocoTipo = "servicos" | "produtos" | "sinalshop";
export type OrcamentoOmieDocTipo = "ordem_servico" | "pedido_venda" | "orcamento";

export type OrcamentoBlocoRow = {
  id: string;
  orcamento_id: string;
  tipo: OrcamentoBlocoTipo;
  empresa_id: string | null;
  omie_doc_tipo: OrcamentoOmieDocTipo | null;
  omie_numero: string | null;
  vendedor: string | null;
  data_documento: string | null;
  previsao_faturamento: string | null;
  condicoes_pagamento: string | null;
  valor_subtotal: number;
  valor_ipi: number;
  valor_icms_st: number;
  valor_iss: number;
  valor_frete: number;
  valor_desconto: number;
  valor_total: number;
  observacoes: string | null;
  created_at: string;
};

export type OrcamentoBlocoComItens = OrcamentoBlocoRow & {
  empresa: { nome: string; cnpj: string | null } | null;
  itens: OrcamentoItemRow[];
};

export const BLOCO_TIPO_LABEL: Record<OrcamentoBlocoTipo, string> = {
  servicos: "Serviços (mão de obra)",
  produtos: "Produtos (material)",
  sinalshop: "Sinalshop (tintas)",
};

export const BLOCO_DOC_LABEL: Record<OrcamentoOmieDocTipo, string> = {
  ordem_servico: "Ordem de Serviço",
  pedido_venda: "Pedido de Venda",
  orcamento: "Orçamento",
};

export const BLOCO_TIPO_TONE: Record<
  OrcamentoBlocoTipo,
  { bg: string; text: string; dot: string }
> = {
  servicos: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  produtos: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  sinalshop: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
};

export type OrcamentoRow = {
  id: string;
  numero: string;
  origem: "sistema" | "omie_import";
  obra_nome: string | null;
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
  /** Tipos de bloco presentes (para montar as opções do PDF na lista). */
  blocos?: { tipo: OrcamentoBlocoTipo }[];
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
  /** Blocos fiscais (presentes quando o orçamento veio do Omie). */
  blocos: OrcamentoBlocoComItens[];
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
