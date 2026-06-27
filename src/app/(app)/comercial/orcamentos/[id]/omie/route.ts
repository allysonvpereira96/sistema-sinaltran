import JSZip from "jszip";
import { getOrcamento } from "@/lib/actions/orcamentos";
import { gerarArquivosOmie } from "@/lib/omie/export-orcamento";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const orcamento = await getOrcamento(id);
  if (!orcamento) return new Response("Orçamento não encontrado", { status: 404 });

  const arquivos = await gerarArquivosOmie(orcamento);
  if (arquivos.length === 0) {
    return new Response("Este orçamento não tem blocos para exportar ao Omie.", {
      status: 422,
    });
  }

  // 1 bloco → baixa o .xlsx direto; vários → zip.
  if (arquivos.length === 1) {
    const { filename, buffer } = arquivos[0];
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const zip = new JSZip();
  for (const a of arquivos) zip.file(a.filename, a.buffer);
  const zipBuf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return new Response(new Uint8Array(zipBuf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="Omie-${orcamento.numero}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
