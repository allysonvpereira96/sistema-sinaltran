import { CLIENTES, UNIDADES } from "./cadastros";

export type ObraStatus =
  | "planejamento"
  | "em_andamento"
  | "pausada"
  | "concluida"
  | "cancelada";

export type Obra = {
  id: string;
  numero: string;
  cliente_id: string;
  unidade_id: string;
  orcamento_id: string | null;
  nome: string;
  responsavel: string;
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
  created_at: string;
  /** valor medido até agora (saldo = valor_total - valor_medido) */
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

export const OBRAS: Obra[] = [
  {
    id: "o-1",
    numero: "OB-2026-014",
    cliente_id: CLIENTES[0].id, // Prefeitura de Caxias
    unidade_id: UNIDADES[0].id,
    orcamento_id: null,
    nome: "Sinalização Av. Brasil — Lote 1",
    responsavel: "Ricardo Campos",
    endereco: "Av. Brasil, trecho km 0 a 4,2",
    cidade: "Caxias do Sul",
    estado: "RS",
    valor_total: 285000,
    mao_obra_direta: 68000,
    mao_obra_indireta: 18000,
    status: "em_andamento",
    data_inicio: "2026-04-12",
    data_fim_prevista: "2026-05-22",
    data_fim_real: null,
    observacoes: "Inclui pintura termoplástica e sinalização vertical complementar.",
    created_at: "2026-04-02T10:00:00Z",
    valor_medido: 185250,
  },
  {
    id: "o-2",
    numero: "OB-2026-013",
    cliente_id: CLIENTES[1].id, // DNIT
    unidade_id: UNIDADES[1].id,
    orcamento_id: null,
    nome: "Tachas Rod. dos Bandeirantes — Trecho Sul",
    responsavel: "Marcos Lima",
    endereco: "BR-116, km 158 ao km 172",
    cidade: "Vacaria",
    estado: "RS",
    valor_total: 168400,
    mao_obra_direta: 42000,
    mao_obra_indireta: 12000,
    status: "em_andamento",
    data_inicio: "2026-04-20",
    data_fim_prevista: "2026-05-17",
    data_fim_real: null,
    observacoes: null,
    created_at: "2026-04-10T14:00:00Z",
    valor_medido: 67360,
  },
  {
    id: "o-3",
    numero: "OB-2026-011",
    cliente_id: CLIENTES[0].id,
    unidade_id: UNIDADES[0].id,
    orcamento_id: null,
    nome: "Placas Centro — Lote 3 (sinalização vertical)",
    responsavel: "Patrícia Almeida",
    endereco: "Rua Sinimbu e adjacências",
    cidade: "Caxias do Sul",
    estado: "RS",
    valor_total: 92000,
    mao_obra_direta: 22000,
    mao_obra_indireta: 7000,
    status: "em_andamento",
    data_inicio: "2026-04-28",
    data_fim_prevista: "2026-05-29",
    data_fim_real: null,
    observacoes: "Aguardando liberação da prefeitura para 12 placas adicionais.",
    created_at: "2026-04-18T09:00:00Z",
    valor_medido: 73600,
  },
  {
    id: "o-4",
    numero: "OB-2026-009",
    cliente_id: CLIENTES[2].id, // CCR ViaSul
    unidade_id: UNIDADES[1].id,
    orcamento_id: null,
    nome: "Semáforos Bairro Industrial",
    responsavel: "Marcos Lima",
    endereco: "BR-290, acesso ao Distrito Industrial",
    cidade: "Gravataí",
    estado: "RS",
    valor_total: 142000,
    mao_obra_direta: 36000,
    mao_obra_indireta: 9000,
    status: "pausada",
    data_inicio: "2026-04-05",
    data_fim_prevista: "2026-06-06",
    data_fim_real: null,
    observacoes: "Aguardando entrega de controlador de tráfego (fornecedor SemSul).",
    created_at: "2026-03-28T11:00:00Z",
    valor_medido: 35500,
  },
  {
    id: "o-5",
    numero: "OB-2026-007",
    cliente_id: CLIENTES[3].id, // Construtora Triunfo
    unidade_id: UNIDADES[0].id,
    orcamento_id: null,
    nome: "Repintura Faixas Escola Municipal",
    responsavel: "Patrícia Almeida",
    endereco: "Rua Plácido de Castro, 1500",
    cidade: "Caxias do Sul",
    estado: "RS",
    valor_total: 48000,
    mao_obra_direta: 11000,
    mao_obra_indireta: 3000,
    status: "em_andamento",
    data_inicio: "2026-05-05",
    data_fim_prevista: "2026-05-19",
    data_fim_real: null,
    observacoes: null,
    created_at: "2026-04-22T08:30:00Z",
    valor_medido: 44160,
  },
  {
    id: "o-6",
    numero: "OB-2026-005",
    cliente_id: CLIENTES[1].id,
    unidade_id: UNIDADES[1].id,
    orcamento_id: null,
    nome: "Implantação tachas Rod. Tabaí-Canoas",
    responsavel: "Ricardo Campos",
    endereco: "BR-386, km 419 ao km 433",
    cidade: "Canoas",
    estado: "RS",
    valor_total: 215000,
    mao_obra_direta: 52000,
    mao_obra_indireta: 14000,
    status: "concluida",
    data_inicio: "2026-02-10",
    data_fim_prevista: "2026-04-10",
    data_fim_real: "2026-04-08",
    observacoes: "Concluída 2 dias antes do prazo.",
    created_at: "2026-02-01T09:00:00Z",
    valor_medido: 215000,
  },
  {
    id: "o-7",
    numero: "OB-2026-003",
    cliente_id: CLIENTES[2].id,
    unidade_id: UNIDADES[1].id,
    orcamento_id: null,
    nome: "Sinalização horizontal pedágio Sul",
    responsavel: "Marcos Lima",
    endereco: "BR-290, praça de pedágio km 81",
    cidade: "Eldorado do Sul",
    estado: "RS",
    valor_total: 124500,
    mao_obra_direta: 30000,
    mao_obra_indireta: 8500,
    status: "planejamento",
    data_inicio: null,
    data_fim_prevista: "2026-06-30",
    data_fim_real: null,
    observacoes: "Aguardando autorização da concessionária.",
    created_at: "2026-05-08T10:30:00Z",
    valor_medido: 0,
  },
];

/** Calcula saldo restante de uma obra com base no valor_medido. */
export function calcularSaldo(obra: Obra) {
  const saldo_restante = Math.max(0, obra.valor_total - obra.valor_medido);
  const percentual_executado = obra.valor_total
    ? (obra.valor_medido / obra.valor_total) * 100
    : 0;
  return {
    saldo_restante,
    percentual_executado,
    percentual_restante: 100 - percentual_executado,
  };
}
