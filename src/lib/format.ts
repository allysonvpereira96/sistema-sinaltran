const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const number = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateBR = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatBRL(value: number | null | undefined) {
  if (value == null) return "—";
  return brl.format(value);
}

export function formatNumber(value: number | null | undefined) {
  if (value == null) return "—";
  return number.format(value);
}

export function formatDateBR(value: string | Date | null | undefined) {
  if (!value) return "—";
  let d: Date;
  if (typeof value === "string") {
    // Datas puras (YYYY-MM-DD) devem ser tratadas como data local — senão
    // `new Date("2026-06-18")` vira meia-noite UTC e recua 1 dia em UTC-3.
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  } else {
    d = value;
  }
  if (Number.isNaN(d.getTime())) return "—";
  return dateBR.format(d);
}

const onlyDigits = /\D/g;

export function formatCNPJ(value: string | null | undefined) {
  if (!value) return "—";
  const digits = value.replace(onlyDigits, "");
  if (digits.length === 14) {
    return digits.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5",
    );
  }
  if (digits.length === 11) {
    return digits.replace(
      /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
      "$1.$2.$3-$4",
    );
  }
  return value;
}

export function formatTelefone(value: string | null | undefined) {
  if (!value) return "—";
  const digits = value.replace(onlyDigits, "");
  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }
  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  return value;
}

export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
