/**
 * Equipamento / frota persistido no Supabase.
 * (Espelha a tabela `public.equipamentos` em 20260609000002_cadastros.sql.)
 */
export type EquipamentoTipo =
  | "veiculo"
  | "maquina_pintura"
  | "equipamento_auxiliar"
  | "ferramenta"
  | "outro";

export type EquipamentoStatus =
  | "disponivel"
  | "em_uso"
  | "manutencao"
  | "inativo";

export type EquipamentoRow = {
  id: string;
  codigo: string;
  descricao: string;
  tipo: EquipamentoTipo;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  status: EquipamentoStatus;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export const EQUIPAMENTO_TIPO_LABEL: Record<EquipamentoTipo, string> = {
  veiculo: "Veículo",
  maquina_pintura: "Máquina de pintura",
  equipamento_auxiliar: "Equipamento auxiliar",
  ferramenta: "Ferramenta",
  outro: "Outro",
};

export const EQUIPAMENTO_STATUS_LABEL: Record<EquipamentoStatus, string> = {
  disponivel: "Disponível",
  em_uso: "Em uso",
  manutencao: "Manutenção",
  inativo: "Inativo",
};

export const EQUIPAMENTO_STATUS_TONE: Record<EquipamentoStatus, string> = {
  disponivel: "bg-emerald-50 text-emerald-600",
  em_uso: "bg-sky-50 text-sky-600",
  manutencao: "bg-amber-50 text-amber-700",
  inativo: "bg-muted text-muted-foreground",
};
