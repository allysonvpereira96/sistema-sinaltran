import { CLIENTES, MATERIAIS } from "./cadastros";

export type OrcamentoStatus =
  | "rascunho"
  | "enviado"
  | "aprovado"
  | "rejeitado"
  | "perdido";

export type OrcamentoItem = {
  id: string;
  ordem: number;
  material_id: string | null;
  descricao: string;
  unidade_medida: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
};

export type Orcamento = {
  id: string;
  numero: string;
  cliente_id: string;
  responsavel: string;
  descricao: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
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
  ordem: number,
  material_id: string | null,
  descricao: string,
  unidade_medida: string,
  quantidade: number,
  valor_unitario: number,
): OrcamentoItem {
  return {
    id: `oi-${ordem}-${Math.random().toString(36).slice(2, 7)}`,
    ordem,
    material_id,
    descricao,
    unidade_medida,
    quantidade,
    valor_unitario,
    valor_total: quantidade * valor_unitario,
  };
}

const o1Itens: OrcamentoItem[] = [
  buildItem(1, MATERIAIS[0].id, "Pintura acrílica branca — sinalização horizontal", "kg", 1200, 18.5),
  buildItem(2, MATERIAIS[1].id, "Pintura acrílica amarela — sinalização horizontal", "kg", 480, 19.2),
  buildItem(3, MATERIAIS[2].id, "Esferas de vidro drop-on para retrorrefletorização", "kg", 600, 6.8),
  buildItem(4, null, "Aplicação termoplástica em via — mão de obra", "m²", 2800, 22.5),
];

const o2Itens: OrcamentoItem[] = [
  buildItem(1, MATERIAIS[6].id, "Tachas refletivas brancas monodirecionais", "UN", 2400, 8.5),
  buildItem(2, MATERIAIS[6].id, "Tachas refletivas amarelas bidirecionais", "UN", 800, 9.8),
  buildItem(3, null, "Implantação e fixação de tachas — mão de obra", "UN", 3200, 12),
];

const o3Itens: OrcamentoItem[] = [
  buildItem(1, MATERIAIS[3].id, "Placas R-1 (Parada obrigatória) 100cm", "UN", 24, 285),
  buildItem(2, MATERIAIS[4].id, "Placas R-2 (Dê preferência) 100cm", "UN", 18, 265),
  buildItem(3, MATERIAIS[5].id, "Coluna galvanizada 3m", "UN", 42, 145),
  buildItem(4, null, "Instalação e fixação de placas — mão de obra", "UN", 42, 180),
];

const o4Itens: OrcamentoItem[] = [
  buildItem(1, MATERIAIS[7].id, "Semáforo de LED 3 focos com controlador", "UN", 6, 4800),
  buildItem(2, null, "Instalação, comissionamento e cabeamento", "UN", 6, 3200),
  buildItem(3, null, "Controlador de tráfego central — programação", "vb", 1, 8500),
];

const sum = (itens: OrcamentoItem[]) =>
  itens.reduce((acc, i) => acc + i.valor_total, 0);

export const ORCAMENTOS: Orcamento[] = [
  {
    id: "oc-1",
    numero: "PR-2026-0028",
    cliente_id: CLIENTES[0].id,
    responsavel: "Ricardo Campos",
    descricao: "Sinalização horizontal Av. Brasil — Lote 2 (km 4,2 ao 8)",
    endereco: "Av. Brasil, km 4,2 ao km 8",
    cidade: "Caxias do Sul",
    estado: "RS",
    valor_total: sum(o1Itens),
    status: "enviado",
    data_envio: "2026-05-28",
    data_validade: "2026-06-28",
    data_aprovacao: null,
    observacoes: "Cliente solicitou condições de pagamento em 2 medições.",
    obra_id: null,
    created_at: "2026-05-27T10:00:00Z",
    itens: o1Itens,
  },
  {
    id: "oc-2",
    numero: "PR-2026-0027",
    cliente_id: CLIENTES[1].id,
    responsavel: "Marcos Lima",
    descricao: "Implantação de tachas Rod. dos Bandeirantes — Trecho Norte",
    endereco: "Rod. dos Bandeirantes, trecho norte",
    cidade: "Vacaria",
    estado: "RS",
    valor_total: sum(o2Itens),
    status: "aprovado",
    data_envio: "2026-05-15",
    data_validade: "2026-06-15",
    data_aprovacao: "2026-05-22",
    observacoes: null,
    obra_id: "o-2",
    created_at: "2026-05-14T08:00:00Z",
    itens: o2Itens,
  },
  {
    id: "oc-3",
    numero: "PR-2026-0026",
    cliente_id: CLIENTES[0].id,
    responsavel: "Patrícia Almeida",
    descricao: "Placas Centro — Lote 4 (sinalização vertical)",
    endereco: "Rua Sinimbu e adjacências",
    cidade: "Caxias do Sul",
    estado: "RS",
    valor_total: sum(o3Itens),
    status: "aprovado",
    data_envio: "2026-05-10",
    data_validade: "2026-06-10",
    data_aprovacao: "2026-05-19",
    observacoes: "Aprovação confirmada por ofício 482/2026.",
    obra_id: "o-3",
    created_at: "2026-05-08T09:00:00Z",
    itens: o3Itens,
  },
  {
    id: "oc-4",
    numero: "PR-2026-0025",
    cliente_id: CLIENTES[4].id,
    responsavel: "Ricardo Campos",
    descricao: "Semáforos Bairro Industrial — Bento Gonçalves",
    endereco: "Bairro Industrial — cruzamentos a definir",
    cidade: "Bento Gonçalves",
    estado: "RS",
    valor_total: sum(o4Itens),
    status: "rascunho",
    data_envio: null,
    data_validade: null,
    data_aprovacao: null,
    observacoes: "Aguardando definição do número de cruzamentos com a prefeitura.",
    obra_id: null,
    created_at: "2026-06-02T14:00:00Z",
    itens: o4Itens,
  },
  {
    id: "oc-5",
    numero: "PR-2026-0024",
    cliente_id: CLIENTES[2].id,
    responsavel: "Marcos Lima",
    descricao: "Sinalização horizontal pedágio Sul — adicional",
    endereco: "BR-290, praça de pedágio km 81",
    cidade: "Eldorado do Sul",
    estado: "RS",
    valor_total: 84500,
    status: "rejeitado",
    data_envio: "2026-04-22",
    data_validade: "2026-05-22",
    data_aprovacao: null,
    observacoes: "Cliente optou por executar internamente.",
    obra_id: null,
    created_at: "2026-04-20T13:00:00Z",
    itens: [
      buildItem(1, null, "Sinalização horizontal — pintura termoplástica", "m²", 1200, 48.5),
      buildItem(2, null, "Sinalização vertical complementar", "UN", 12, 2200),
    ],
  },
];
