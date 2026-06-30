import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  getMedicao,
  getAcumuladoAnteriorItens,
} from "@/lib/actions/medicoes";
import { getObra } from "@/lib/actions/obras";
import { getEmpresaParaPdf } from "@/lib/actions/empresas";
import { MedicaoDocument } from "@/lib/pdf/medicao-document";
import { LOGO_SINALTRAN } from "@/lib/pdf/logo-sinaltran";
import { LOGO_SINALSHOP } from "@/lib/pdf/logo-sinalshop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const medicao = await getMedicao(id);
  if (!medicao) return new Response("Medição não encontrada", { status: 404 });

  const empresaKey =
    new URL(req.url).searchParams.get("empresa") === "sinalshop"
      ? "sinalshop"
      : "sinaltran";

  const [obra, empresa, anterior] = await Promise.all([
    medicao.obra_id ? getObra(medicao.obra_id) : Promise.resolve(null),
    getEmpresaParaPdf(empresaKey === "sinalshop" ? "Sinalshop" : "Sinaltran"),
    getAcumuladoAnteriorItens(id),
  ]);

  const logo = empresaKey === "sinalshop" ? LOGO_SINALSHOP : LOGO_SINALTRAN;
  const elemento = createElement(MedicaoDocument, {
    medicao,
    obra,
    empresa,
    anterior,
    logo,
  }) as unknown as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(elemento);

  const nome = `Medicao-${String(medicao.numero).padStart(2, "0")}-${medicao.obra?.numero ?? ""}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
