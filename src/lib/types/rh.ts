/** Tipos das tabelas de controle de RH (ASO, treinamentos, experiência). */

export type AsoTipoExame =
  | "admissional"
  | "periodico"
  | "demissional"
  | "mudanca_funcao"
  | "retorno_trabalho";

export type AsoResultado = "apto" | "inapto" | "apto_com_restricoes";

export type ColaboradorAso = {
  id: string;
  colaborador_id: string;
  tipo_exame: AsoTipoExame;
  data_realizacao: string | null;
  periodicidade_meses: number;
  vencimento: string | null;
  resultado: AsoResultado | null;
  responsavel: string | null;
  observacoes: string | null;
  anexo_url: string | null;
  created_at: string;
};

export type ColaboradorTreinamento = {
  id: string;
  colaborador_id: string;
  treinamento: string;
  data_realizacao: string | null;
  validade_meses: number | null;
  vencimento: string | null;
  fornecedor_instrutor: string | null;
  observacoes: string | null;
  anexo_url: string | null;
  created_at: string;
};

export type ColaboradorExperiencia = {
  id: string;
  colaborador_id: string;
  marco_30: string | null;
  marco_45: string | null;
  marco_60: string | null;
  marco_90: string | null;
  avaliacao: string | null;
  observacoes: string | null;
  created_at: string;
};

/** Linha da view vw_colaborador_vencimentos (ASO + Treinamentos + Férias). */
export type VencimentoRow = {
  tipo: string;
  registro_id: string;
  colaborador_id: string;
  colaborador: string;
  setor: string | null;
  descricao: string;
  vencimento: string | null;
  dias_para_vencer: number | null;
};

/**
 * Período aquisitivo de férias do colaborador (espelha o relatório da
 * contabilidade). Não é o GOZO — é o "estado do direito" naquele momento.
 */
export type ColaboradorPeriodoAquisitivo = {
  id: string;
  colaborador_id: string;
  aquisitivo_inicio: string;
  aquisitivo_fim: string;
  dias_direito: number;
  concessivo_inicio: string | null;
  concessivo_fim: string | null;
  prazo_dobro: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

/** Linha da view vw_ferias_risco_dobra. */
export type FeriasRiscoRow = {
  registro_id: string;
  colaborador_id: string;
  colaborador: string;
  matricula: string | null;
  cargo: string | null;
  setor: string | null;
  aquisitivo_inicio: string;
  aquisitivo_fim: string;
  dias_direito: number;
  concessivo_inicio: string | null;
  concessivo_fim: string | null;
  prazo_dobro: string;
  dias_para_dobra: number;
};

export const ASO_TIPO_LABEL: Record<AsoTipoExame, string> = {
  admissional: "Admissional",
  periodico: "Periódico",
  demissional: "Demissional",
  mudanca_funcao: "Mudança de função",
  retorno_trabalho: "Retorno ao trabalho",
};

export const ASO_RESULTADO_LABEL: Record<AsoResultado, string> = {
  apto: "Apto",
  inapto: "Inapto",
  apto_com_restricoes: "Apto c/ restrições",
};

/** Periodicidades comuns de ASO em meses. */
export const ASO_PERIODICIDADES = [
  { meses: 6, label: "Semestral" },
  { meses: 12, label: "Anual" },
  { meses: 24, label: "Bienal" },
] as const;

/**
 * Catálogo de treinamentos/NRs com validade padrão SUGERIDA (em meses).
 * A validade é editável no cadastro — periodicidades reais variam por NR,
 * classe de risco e política da empresa. `null` = sem validade/reciclagem fixa.
 */
export type TreinamentoCatalogoItem = { nome: string; validade_meses: number | null };

/** Linha da tabela editável public.treinamentos_catalogo. */
export type TreinamentoCatalogo = {
  id: string;
  nome: string;
  validade_meses: number | null;
  ativo: boolean;
  created_at: string;
};

export const TREINAMENTOS_CATALOGO: TreinamentoCatalogoItem[] = [
  { nome: "NR-06 — EPI", validade_meses: null },
  { nome: "NR-10 — Segurança em instalações elétricas", validade_meses: 24 },
  { nome: "NR-11 — Movimentação de materiais", validade_meses: 12 },
  { nome: "NR-12 — Máquinas e equipamentos", validade_meses: 24 },
  { nome: "NR-17 — Ergonomia", validade_meses: 24 },
  { nome: "NR-18 — Construção civil", validade_meses: 12 },
  { nome: "NR-20 — Inflamáveis e combustíveis", validade_meses: 12 },
  { nome: "NR-23 — Proteção contra incêndios", validade_meses: 12 },
  { nome: "NR-33 — Espaços confinados", validade_meses: 12 },
  { nome: "NR-35 — Trabalho em altura", validade_meses: 24 },
  { nome: "Direção defensiva", validade_meses: 12 },
  { nome: "Sinalização e segurança viária", validade_meses: 12 },
  { nome: "Primeiros socorros", validade_meses: 12 },
  { nome: "Brigada de incêndio", validade_meses: 12 },
  { nome: "CIPA", validade_meses: 12 },
];
