/**
 * Ordem de Serviço diária ("O.S Diário — Equipe Trecho") persistida no Supabase.
 * (Espelha a tabela `public.ordens_servico` em 20260620000001_obras_os.sql.)
 */
export type OSStatus = "aberta" | "em_andamento" | "concluida" | "cancelada";

export type OSRow = {
  id: string;
  numero: string;
  empresa_id: string | null;
  obra_id: string | null;
  cliente_id: string | null;
  pedido_omie: string | null;
  data: string;
  hora_saida: string | null;
  hora_chegada: string | null;
  cidade: string | null;
  veiculo_id: string | null;
  encarregado_id: string | null;
  motorista_id: string | null;
  km_inicial: number | null;
  km_final: number | null;
  diaristas: string | null;
  status: OSStatus;
  observacoes: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
};

type ObraEmbed = {
  numero: string;
  nome: string;
} | null;

type ClienteEmbed = {
  razao_social: string;
  nome_fantasia: string | null;
} | null;

type EquipamentoEmbed = {
  codigo: string;
  descricao: string;
  placa: string | null;
} | null;

type ColaboradorEmbed = {
  nome_completo: string;
  cargo: string | null;
} | null;

/** Linha da listagem (com obra, cliente e responsáveis já embutidos). */
export type OSListRow = OSRow & {
  obra: ObraEmbed;
  cliente: ClienteEmbed;
  encarregado: ColaboradorEmbed;
  motorista: ColaboradorEmbed;
};

/** Membro da equipe CLT da O.S. */
export type OSEquipeMembro = {
  id: string;
  colaborador_id: string;
  ordem: number;
  nome_completo: string;
  cargo: string | null;
};

/** O.S completa para o detalhe / PDF. */
export type OSDetalhe = OSRow & {
  obra: ObraEmbed;
  cliente: ClienteEmbed;
  veiculo: EquipamentoEmbed;
  encarregado: ColaboradorEmbed;
  motorista: ColaboradorEmbed;
  equipe: OSEquipeMembro[];
};

export const OS_STATUS_LABEL: Record<OSStatus, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const OS_STATUS_TONE: Record<
  OSStatus,
  { bg: string; text: string; dot: string }
> = {
  aberta: { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-400" },
  em_andamento: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  concluida: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelada: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
};
