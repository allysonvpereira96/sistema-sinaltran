/**
 * Cliente persistido no Supabase.
 * (Espelha a tabela `public.clientes` definida em 002_cadastros.sql.)
 */
export type ClienteRow = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj_cpf: string | null;
  tipo_pessoa: "juridica" | "fisica" | "publico";
  email: string | null;
  telefone: string | null;
  responsavel: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Dados retornados pela busca da BrasilAPI / Receita Federal,
 * normalizados para o formato do nosso cadastro.
 */
export type CnpjLookupResult = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  situacao: string | null;
  data_situacao: string | null;
};
