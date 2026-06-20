import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getOrdemServico } from "@/lib/actions/ordens-servico";
import { OSDocument } from "@/lib/pdf/os-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const os = await getOrdemServico(id);
  if (!os) {
    return new Response("Ordem de serviço não encontrada.", { status: 404 });
  }

  const elemento = createElement(OSDocument, { os }) as unknown as Parameters<
    typeof renderToBuffer
  >[0];
  const buffer = await renderToBuffer(elemento);

  const nome = `OS-${os.numero}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
