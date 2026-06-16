/**
 * Utilitários de CNPJ/CPF (Brasil).
 */

/** Remove tudo que não for dígito. */
export function onlyDigits(s: string | null | undefined): string {
  if (!s) return "";
  return String(s).replace(/\D/g, "");
}

/** Formata CNPJ digit-only para 00.000.000/0000-00. */
export function formatCNPJ(digits: string | null | undefined): string {
  const d = onlyDigits(digits);
  if (d.length !== 14) return d;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Formata CPF digit-only para 000.000.000-00. */
export function formatCPF(digits: string | null | undefined): string {
  const d = onlyDigits(digits);
  if (d.length !== 11) return d;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Formata documento por tamanho. */
export function formatCnpjCpf(digits: string | null | undefined): string {
  const d = onlyDigits(digits);
  if (d.length === 14) return formatCNPJ(d);
  if (d.length === 11) return formatCPF(d);
  return d;
}

/**
 * Validação de CNPJ — apenas estrutura e dígitos verificadores.
 * Não valida com a Receita Federal.
 */
export function isValidCnpj(cnpj: string | null | undefined): boolean {
  const d = onlyDigits(cnpj);
  if (d.length !== 14) return false;
  // Rejeita sequências repetidas (00000000000000, 11111111111111, etc)
  if (/^(\d)\1+$/.test(d)) return false;

  const calc = (slice: number) => {
    const nums = d.slice(0, slice).split("").map(Number);
    const weights =
      slice === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = nums.reduce((acc, n, i) => acc + n * weights[i], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  return (
    calc(12) === Number(d[12]) && calc(13) === Number(d[13])
  );
}
