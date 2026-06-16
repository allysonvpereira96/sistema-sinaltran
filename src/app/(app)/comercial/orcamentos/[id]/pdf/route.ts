import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getOrcamento } from "@/lib/actions/orcamentos";
import { OrcamentoDocument } from "@/lib/pdf/orcamento-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const orcamento = await getOrcamento(id);
  if (!orcamento) {
    return new Response("Orçamento não encontrado", { status: 404 });
  }

  const elemento = createElement(OrcamentoDocument, {
    orcamento,
  }) as unknown as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(elemento);

  const nome = `Orcamento-${orcamento.numero}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
