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
