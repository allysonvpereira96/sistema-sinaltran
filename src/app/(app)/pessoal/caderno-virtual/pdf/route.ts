import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { listOcorrenciasCaderno } from "@/lib/actions/caderno-virtual";
import { listCentrosCusto } from "@/lib/actions/colaboradores";
import { CadernoVirtualDocument } from "@/lib/pdf/caderno-virtual-document";
import type { OcorrenciaTipo } from "@/lib/mocks/colaboradores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampMes(n: number) {
  if (Number.isNaN(n) || n < 1) return 1;
  if (n > 12) return 12;
  return n;
}

function rangeDoMes(ano: number, mes: number) {
  const inicio = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 0));
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: toIso(inicio), fim: toIso(fim) };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const now = new Date();
  const ano = Number(url.searchParams.get("ano")) || now.getUTCFullYear();
  const mes = clampMes(Number(url.searchParams.get("mes")) || now.getUTCMonth() + 1);
  const tipo =
    (url.searchParams.get("tipo") as OcorrenciaTipo | "todos" | null) ?? "todos";
  const cc = url.searchParams.get("cc") ?? "todos";

  const { inicio, fim } = rangeDoMes(ano, mes);
  const [ocorrencias, centros] = await Promise.all([
    listOcorrenciasCaderno({ inicio, fim, tipo, centroCustoId: cc }),
    listCentrosCusto(),
  ]);

  const centroCustoNome =
    cc !== "todos" ? centros.find((c) => c.id === cc)?.nome ?? null : null;

  const elemento = createElement(CadernoVirtualDocument, {
    ano,
    mes,
    ocorrencias,
    filtros: { tipo, centroCustoNome },
  }) as unknown as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(elemento);

  const nome = `Caderno-Virtual-${ano}-${String(mes).padStart(2, "0")}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
