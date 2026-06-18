import type { Colaborador } from "@/lib/mocks/colaboradores";

/**
 * Fallback do salário mínimo, usado quando o parâmetro não está disponível
 * (sem Supabase / parâmetro ausente). O valor oficial vem da tabela
 * `parametros` (chave "salario_minimo"), editável em Configurações → Parâmetros.
 */
export const SALARIO_MINIMO_PADRAO = 1621;

/** Adicional de insalubridade em reais: percentual sobre o salário mínimo. */
export function valorInsalubridade(
  pct: number | null | undefined,
  salarioMinimo: number = SALARIO_MINIMO_PADRAO,
): number {
  return ((pct ?? 0) / 100) * salarioMinimo;
}

/**
 * Custo mensal do colaborador:
 * remuneração base + auxílio mobilidade + adicional de insalubridade.
 */
export function custoMensalColaborador(
  c: Pick<Colaborador, "remuneracao_base" | "ajuda_custo" | "insalubridade_pct">,
  salarioMinimo: number = SALARIO_MINIMO_PADRAO,
): number {
  return (
    (c.remuneracao_base ?? 0) +
    (c.ajuda_custo ?? 0) +
    valorInsalubridade(c.insalubridade_pct, salarioMinimo)
  );
}
