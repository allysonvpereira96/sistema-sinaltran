import type { Colaborador } from "@/lib/mocks/colaboradores";

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Data local → "YYYY-MM-DD" (sem deslocamento de fuso). */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function hojeISO(): string {
  return ymd(new Date());
}

export function inicioMesISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function inicioAnoISO(): string {
  return `${new Date().getFullYear()}-01-01`;
}

/** Recorta a lista pela empresa selecionada ("todas" = sem filtro). */
export function escopoEmpresa(colaboradores: Colaborador[], empresaId: string): Colaborador[] {
  return empresaId === "todas" ? colaboradores : colaboradores.filter((c) => c.empresa_id === empresaId);
}

/** Gera e baixa um CSV (separador ";", BOM para Excel PT-BR). */
export function baixarCSV(
  filename: string,
  header: string[],
  rows: (string | number | null | undefined)[][],
) {
  const sep = ";";
  const esc = (s: string | number | null | undefined) =>
    `"${String(s ?? "").replace(/"/g, '""')}"`;
  const csv =
    "﻿" +
    [header, ...rows].map((r) => r.map(esc).join(sep)).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
