/**
 * Tipos de usuários / acesso por módulo.
 *
 * `ModuloKey` espelha as `key`s das seções da navegação (src/config/navigation.ts).
 * A seção "Operação" (Dashboard) não tem key — é sempre liberada.
 */
export type ModuloKey =
  | "comercial"
  | "obras"
  | "financeiro"
  | "producao"
  | "pessoal"
  | "cadastros"
  | "gestao";

export type AppRole = "admin" | "user";

/** Linha exibida na tela de gestão de usuários. */
export type UsuarioRow = {
  id: string;
  email: string;
  nome: string;
  role: AppRole;
  modulos: ModuloKey[];
  ativo: boolean;
  created_at: string;
};

/** Profile do usuário logado (usado pelo layout / sidebar). */
export type CurrentProfile = {
  id: string;
  email: string;
  nome: string;
  role: AppRole;
  modulos: ModuloKey[];
};
