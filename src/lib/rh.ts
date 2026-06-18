import type { Colaborador } from "@/lib/mocks/colaboradores";

/**
 * Salário mínimo nacional vigente — base de cálculo do adicional de insalubridade.
 * ⚠️ ATUALIZE este valor quando o piso mudar (vira todo início de ano).
 */
export const SALARIO_MINIMO = 1518;

/** Adicional de insalubridade em reais: percentual sobre o salário mínimo. */
export function valorInsalubridade(pct: number | null | undefined): number {
  return ((pct ?? 0) / 100) * SALARIO_MINIMO;
}

/**
 * Custo mensal do colaborador:
 * remuneração base + auxílio mobilidade + adicional de insalubridade.
 */
export function custoMensalColaborador(
  c: Pick<Colaborador, "remuneracao_base" | "ajuda_custo" | "insalubridade_pct">,
): number {
  return (
    (c.remuneracao_base ?? 0) +
    (c.ajuda_custo ?? 0) +
    valorInsalubridade(c.insalubridade_pct)
  );
}
