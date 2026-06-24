/**
 * Material / Produto persistido no Supabase.
 * (Espelha a tabela `public.materiais` — base em 002_cadastros.sql,
 * estendida em 20260616000005_materiais_produtos.sql.)
 */
export type MaterialCategoria =
  | "tinta"
  | "esfera_vidro"
  | "placa"
  | "coluna"
  | "tacha"
  | "semaforo"
  | "pelicula"
  | "diluente"
  | "fixador"
  | "outro";

export type MaterialRow = {
  id: string;
  empresa_id: string | null;
  codigo: string | null;
  descricao: string;
  categoria: MaterialCategoria;
  familia: string | null;
  ncm: string | null;
  classificacao: string | null;
  unidade_medida: string;
  unidade_fornecedor: string | null;
  peso: string | null;
  fornecedores: string | null;
  valor_referencia: number;
  valor_mao_obra: number;
  estoque_minimo: number;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export const MATERIAL_CATEGORIA_LABEL: Record<MaterialCategoria, string> = {
  tinta: "Tinta",
  esfera_vidro: "Esfera de vidro",
  placa: "Placa",
  coluna: "Coluna",
  tacha: "Tacha",
  semaforo: "Semáforo",
  pelicula: "Película",
  diluente: "Diluente",
  fixador: "Fixador",
  outro: "Outro",
};
