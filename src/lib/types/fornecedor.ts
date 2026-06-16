/**
 * Fornecedor persistido no Supabase.
 * (Espelha a tabela `public.fornecedores` definida em 002_cadastros.sql.)
 */
export type FornecedorRow = {
  id: string;
  nome: string;
  nome_fantasia: string | null;
  cnpj_cpf: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};
