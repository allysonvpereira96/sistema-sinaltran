import { OBRAS } from "./obras";

export type MedicaoStatus =
  | "rascunho"
  | "enviada"
  | "aprovada"
  | "rejeitada";

export type Medicao = {
  id: string;
  obra_id: string;
  numero: number;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
  percentual_executado: number;
  status: MedicaoStatus;
  observacoes: string | null;
  /** data em que foi enviada para o cliente */
  data_envio: string | null;
  /** data em que o cliente aprovou (gera conta a receber) */
  data_aprovacao: string | null;
  /** previsão de recebimento (data_aprovacao + prazo do contrato) */
  data_previsao_recebimento: string | null;
  created_at: string;
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

// Medições reproduzem os valores de obra.valor_medido
export const MEDICOES: Medicao[] = [
  // OB-2026-014 — Sinalização Av. Brasil (medido 185.250 de 285.000)
  {
    id: "med-1",
    obra_id: "o-1",
    numero: 1,
    data_inicio: "2026-04-12",
    data_fim: "2026-04-30",
    valor_total: 85500,
    percentual_executado: 30,
    status: "aprovada",
    observacoes: "Trecho inicial — km 0 ao 1,5.",
    data_envio: "2026-05-01",
    data_aprovacao: "2026-05-06",
    data_previsao_recebimento: "2026-06-05",
    created_at: "2026-05-01T09:00:00Z",
  },
  {
    id: "med-2",
    obra_id: "o-1",
    numero: 2,
    data_inicio: "2026-05-01",
    data_fim: "2026-05-20",
    valor_total: 99750,
    percentual_executado: 35,
    status: "enviada",
    observacoes: "Trecho km 1,5 ao 3,2.",
    data_envio: "2026-05-22",
    data_aprovacao: null,
    data_previsao_recebimento: null,
    created_at: "2026-05-22T11:00:00Z",
  },

  // OB-2026-013 — Tachas Rod. Bandeirantes (medido 67.360 de 168.400)
  {
    id: "med-3",
    obra_id: "o-2",
    numero: 1,
    data_inicio: "2026-04-20",
    data_fim: "2026-05-08",
    valor_total: 67360,
    percentual_executado: 40,
    status: "aprovada",
    observacoes: null,
    data_envio: "2026-05-09",
    data_aprovacao: "2026-05-13",
    data_previsao_recebimento: "2026-06-12",
    created_at: "2026-05-09T10:30:00Z",
  },

  // OB-2026-011 — Placas Centro Lote 3 (medido 73.600 de 92.000)
  {
    id: "med-4",
    obra_id: "o-3",
    numero: 1,
    data_inicio: "2026-04-28",
    data_fim: "2026-05-15",
    valor_total: 36800,
    percentual_executado: 40,
    status: "aprovada",
    observacoes: null,
    data_envio: "2026-05-16",
    data_aprovacao: "2026-05-20",
    data_previsao_recebimento: "2026-06-19",
    created_at: "2026-05-16T09:00:00Z",
  },
  {
    id: "med-5",
    obra_id: "o-3",
    numero: 2,
    data_inicio: "2026-05-16",
    data_fim: "2026-05-30",
    valor_total: 36800,
    percentual_executado: 40,
    status: "rascunho",
    observacoes: "Aguardando vistoria do cliente.",
    data_envio: null,
    data_aprovacao: null,
    data_previsao_recebimento: null,
    created_at: "2026-05-30T16:00:00Z",
  },

  // OB-2026-009 — Semáforos Bairro Industrial (medido 35.500 de 142.000)
  {
    id: "med-6",
    obra_id: "o-4",
    numero: 1,
    data_inicio: "2026-04-05",
    data_fim: "2026-04-25",
    valor_total: 35500,
    percentual_executado: 25,
    status: "aprovada",
    observacoes: "Instalação dos suportes e cabeamento.",
    data_envio: "2026-04-26",
    data_aprovacao: "2026-05-02",
    data_previsao_recebimento: "2026-06-01",
    created_at: "2026-04-26T08:30:00Z",
  },

  // OB-2026-007 — Repintura Faixas Escola (medido 44.160 de 48.000)
  {
    id: "med-7",
    obra_id: "o-5",
    numero: 1,
    data_inicio: "2026-05-05",
    data_fim: "2026-05-18",
    valor_total: 44160,
    percentual_executado: 92,
    status: "enviada",
    observacoes: "Quase concluída — faltam ajustes finais.",
    data_envio: "2026-05-19",
    data_aprovacao: null,
    data_previsao_recebimento: null,
    created_at: "2026-05-19T14:00:00Z",
  },

  // OB-2026-005 — Tachas Tabaí-Canoas (concluída, medido 215.000 de 215.000)
  {
    id: "med-8",
    obra_id: "o-6",
    numero: 1,
    data_inicio: "2026-02-10",
    data_fim: "2026-03-08",
    valor_total: 107500,
    percentual_executado: 50,
    status: "aprovada",
    observacoes: null,
    data_envio: "2026-03-10",
    data_aprovacao: "2026-03-14",
    data_previsao_recebimento: "2026-04-13",
    created_at: "2026-03-10T09:00:00Z",
  },
  {
    id: "med-9",
    obra_id: "o-6",
    numero: 2,
    data_inicio: "2026-03-09",
    data_fim: "2026-04-08",
    valor_total: 107500,
    percentual_executado: 50,
    status: "aprovada",
    observacoes: "Encerramento da obra.",
    data_envio: "2026-04-10",
    data_aprovacao: "2026-04-15",
    data_previsao_recebimento: "2026-05-15",
    created_at: "2026-04-10T11:00:00Z",
  },
];

export function getMedicoesPorObra(obra_id: string) {
  return MEDICOES.filter((m) => m.obra_id === obra_id).sort(
    (a, b) => a.numero - b.numero,
  );
}

export function getObraById(id: string) {
  return OBRAS.find((o) => o.id === id);
}
