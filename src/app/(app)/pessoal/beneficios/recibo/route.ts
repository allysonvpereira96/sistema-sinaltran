import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getReciboCesta } from "@/lib/actions/beneficios";
import { ReciboBeneficioDocument } from "@/lib/pdf/recibo-beneficio-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo") ?? "";
  const colaboradorId = url.searchParams.get("colaborador") ?? "";
  const competencia = url.searchParams.get("competencia") ?? "";

  if (!colaboradorId || !competencia) return new Response("Parâmetros ausentes.", { status: 400 });

  const hoje = new Date();
  const emissao = `${String(hoje.getDate()).padStart(2, "0")}/${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;

  if (tipo === "cesta") {
    const r = await getReciboCesta(colaboradorId, competencia);
    if (!r) return new Response("Lançamento não encontrado.", { status: 404 });
    const elemento = createElement(ReciboBeneficioDocument, {
      titulo: "RECIBO DE CESTA BÁSICA",
      empregado: r.empregado,
      funcao: r.funcao,
      competencia: r.competencia,
      declaracao: `Declaro que recebi, da empresa, a cesta básica referente à competência ${r.competencia}, em boas condições e para os devidos fins.`,
      emissao,
    }) as unknown as Parameters<typeof renderToBuffer>[0];
    const buffer = await renderToBuffer(elemento);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Recibo-Cesta-${competencia}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response("Tipo de benefício não suportado.", { status: 400 });
}
