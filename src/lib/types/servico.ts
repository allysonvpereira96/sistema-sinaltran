/**
 * Serviço persistido no Supabase.
 * (Espelha a tabela `public.servicos` definida em 20260616000003_servicos.sql.)
 */
export type ServicoRow = {
  id: string;
  codigo: string;
  descricao: string;
  descricao_completa: string | null;
  categoria: string | null;
  codigo_lc116: string | null;
  codigo_municipio: string | null;
  unidade_padrao: string | null;
  preco_unitario: number;
  aliquota_iss: number;
  retem_iss: boolean;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

/** Unidades padrão sugeridas para o preço de referência. */
export const UNIDADES_SERVICO = [
  { value: "m2", label: "m² (metro quadrado)" },
  { value: "metro", label: "m (metro linear)" },
  { value: "unidade", label: "Unidade" },
  { value: "diaria", label: "Diária" },
  { value: "hora", label: "Hora" },
  { value: "global", label: "Global (verba)" },
] as const;

export const UNIDADE_SERVICO_LABEL: Record<string, string> = Object.fromEntries(
  UNIDADES_SERVICO.map((u) => [u.value, u.label]),
);
