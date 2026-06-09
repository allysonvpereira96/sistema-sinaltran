import { CLIENTES, EMPRESAS } from "./cadastros";

export type OrcamentoStatus =
  | "rascunho"
  | "enviado"
  | "aprovado"
  | "rejeitado"
  | "perdido";

export type OrcamentoItem = {
  id: string;
  secao: string;
  ordem: number;
  material_id: string | null;
  descricao: string;
  unidade_medida: string;
  quantidade: number;
  valor_unit_mao_obra: number;
  valor_unit_material: number;
  valor_total_mao_obra: number;
  valor_total_material: number;
  valor_total: number;
};

export type Orcamento = {
  id: string;
  numero: string;
  empresa_id: string;
  cliente_id: string;
  responsavel: string;
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
  created_at: string;
  itens: OrcamentoItem[];
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

function buildItem(
  secao: string,
  ordem: number,
  material_id: string | null,
  descricao: string,
  unidade_medida: string,
  quantidade: number,
  valor_unit_mao_obra: number,
  valor_unit_material: number,
): OrcamentoItem {
  const valor_total_mao_obra = quantidade * valor_unit_mao_obra;
  const valor_total_material = quantidade * valor_unit_material;
  return {
    id: `oi-${ordem}-${Math.random().toString(36).slice(2, 7)}`,
    secao,
    ordem,
    material_id,
    descricao,
    unidade_medida,
    quantidade,
    valor_unit_mao_obra,
    valor_unit_material,
    valor_total_mao_obra,
    valor_total_material,
    valor_total: valor_total_mao_obra + valor_total_material,
  };
}

// Mock baseado no orçamento real "ORC1 DOBIL ENGENHARIA ARARICA"
const dobilItens: OrcamentoItem[] = [
  buildItem(
    "SINALIZAÇÃO HORIZONTAL",
    1,
    null,
    "Sinalização horizontal com tinta acrílica NBR 11.862, micro esferas inclusas, pintura de eixo e bordos",
    "m²",
    189.8,
    12.5,
    16.5,
  ),
  buildItem(
    "SINALIZAÇÃO HORIZONTAL",
    2,
    null,
    "Sinalização horizontal com tinta acrílica NBR 11.862, micro esferas inclusas, pintura de áreas especiais",
    "m²",
    168.62,
    4.5,
    16.5,
  ),
  buildItem(
    "SINALIZAÇÃO VERTICAL",
    3,
    null,
    "Placa em chapa de aço 1,25mm, verso preto fosco, frente película GTP I marca 3M, modelo R1 L 0,33m",
    "unid",
    5,
    0,
    420,
  ),
  buildItem(
    "SINALIZAÇÃO VERTICAL",
    4,
    null,
    "Placa em chapa de aço 1,25mm, verso preto fosco, frente película GTP I marca 3M, modelo ADV. L 0,50m",
    "unid",
    43,
    0,
    105,
  ),
  buildItem(
    "SINALIZAÇÃO VERTICAL",
    5,
    null,
    "Placa em chapa de aço 1,25mm, verso preto fosco, frente película GTP I marca 3M, modelo regulamentação Ø 0,50m",
    "unid",
    10,
    0,
    105,
  ),
  buildItem(
    "SINALIZAÇÃO VERTICAL",
    6,
    null,
    "Placa em chapa de aço 1,25mm, frente e verso azul royal, toponímicas 0,45 x 0,25m",
    "unid",
    12,
    0,
    85,
  ),
  buildItem(
    "SINALIZAÇÃO VERTICAL",
    7,
    null,
    "Placa em chapa de aço 1,25mm, verso preto fosco, frente película GTP I marca 3M, modelo indicativa 1,20 x 1,60m",
    "unid",
    3,
    0,
    1036,
  ),
  buildItem(
    "SUPORTES",
    8,
    null,
    'Suporte metálico galvanizado 2" x 3,00m',
    "unid",
    62,
    140,
    175,
  ),
  buildItem(
    "SUPORTES",
    9,
    null,
    'Suporte metálico galvanizado 2" x 3,50m',
    "unid",
    5,
    140,
    195,
  ),
];

const sum = (itens: OrcamentoItem[]) =>
  itens.reduce((acc, i) => acc + i.valor_total, 0);

export const ORCAMENTOS: Orcamento[] = [
  {
    id: "oc-1",
    numero: "ORC-2026-0001",
    empresa_id: EMPRESAS[0].id,
    cliente_id: CLIENTES[3].id,
    responsavel: "Vinicius Silva",
    descricao: "Sinalização viária — obra Ararica",
    endereco: "Trecho urbano — Ararica",
    cidade: "Ararica",
    estado: "RS",
    engenheiro_responsavel: "Gabriela Betiolo",
    crea_engenheiro: "244084 CREA/RS",
    prazo_execucao: "5 dias",
    condicoes_pagamento: "Boleto 30 dias",
    valor_total: sum(dobilItens),
    status: "enviado",
    data_envio: "2026-05-28",
    data_validade: "2026-06-27",
    data_aprovacao: null,
    observacoes: null,
    obra_id: null,
    created_at: "2026-05-28T10:00:00Z",
    itens: dobilItens,
  },
  {
    id: "oc-2",
    numero: "ORC-2026-0002",
    empresa_id: EMPRESAS[0].id,
    cliente_id: CLIENTES[0].id,
    responsavel: "Vinicius Silva",
    descricao: "Implantação tachas Rod. dos Bandeirantes",
    endereco: "Rod. dos Bandeirantes, trecho norte",
    cidade: "Vacaria",
    estado: "RS",
    engenheiro_responsavel: null,
    crea_engenheiro: null,
    prazo_execucao: "10 dias",
    condicoes_pagamento: "Boleto 30 dias",
    valor_total: 56400,
    status: "aprovado",
    data_envio: "2026-05-15",
    data_validade: "2026-06-15",
    data_aprovacao: "2026-05-22",
    observacoes: null,
    obra_id: "o-2",
    created_at: "2026-05-14T08:00:00Z",
    itens: [
      buildItem("TACHAS REFLETIVAS", 1, null, "Tachas refletivas brancas monodirecionais", "unid", 2400, 4, 8.5),
      buildItem("TACHAS REFLETIVAS", 2, null, "Tachas refletivas amarelas bidirecionais", "unid", 800, 4, 9.8),
    ],
  },
  {
    id: "oc-3",
    numero: "ORC-2026-0003",
    empresa_id: EMPRESAS[1].id, // Sinalshop
    cliente_id: CLIENTES[2].id,
    responsavel: "Marcos Lima",
    descricao: "Fornecimento de tinta termoplástica — pedágio Sul",
    endereco: "BR-290, praça de pedágio km 81",
    cidade: "Eldorado do Sul",
    estado: "RS",
    engenheiro_responsavel: null,
    crea_engenheiro: null,
    prazo_execucao: "Pronta entrega",
    condicoes_pagamento: "À vista",
    valor_total: 58200,
    status: "rascunho",
    data_envio: null,
    data_validade: null,
    data_aprovacao: null,
    observacoes: "Aguardando confirmação de volume.",
    obra_id: null,
    created_at: "2026-06-02T14:00:00Z",
    itens: [
      buildItem("TINTA", 1, null, "Tinta acrílica branca para sinalização — sacaria 25kg", "kg", 1200, 0, 18.5),
      buildItem("TINTA", 2, null, "Tinta acrílica amarela para sinalização — sacaria 25kg", "kg", 480, 0, 19.2),
      buildItem("INSUMOS", 3, null, "Esferas de vidro drop-on", "kg", 800, 0, 6.8),
      buildItem("INSUMOS", 4, null, "Diluente acrílico", "L", 200, 0, 12.4),
    ],
  },
];
