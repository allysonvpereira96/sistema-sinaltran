import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getOrcamento } from "@/lib/actions/orcamentos";
import { getEmpresaParaPdf } from "@/lib/actions/empresas";
import { OrcamentoDocument, type ConteudoPdf } from "@/lib/pdf/orcamento-document";
import { LOGO_SINALTRAN } from "@/lib/pdf/logo-sinaltran";
import { LOGO_SINALSHOP } from "@/lib/pdf/logo-sinalshop";
import type { OrcamentoDetalhe } from "@/lib/types/orcamento";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EmpresaKey = "sinaltran" | "sinalshop";

const CONTEUDOS: ConteudoPdf[] = [
  "completo",
  "servicos",
  "material",
  "produtos",
  "sinalshop",
];

/** Renderiza um PDF do orçamento para um conteúdo + empresa específicos. */
async function renderPdf(
  orcamento: OrcamentoDetalhe,
  conteudo: ConteudoPdf,
  empresaKey: EmpresaKey,
): Promise<Buffer> {
  const empresa = await getEmpresaParaPdf(empresaKey === "sinalshop" ? "Sinalshop" : "Sinaltran");
  const logo = empresaKey === "sinalshop" ? LOGO_SINALSHOP : LOGO_SINALTRAN;
  const elemento = createElement(OrcamentoDocument, {
    orcamento,
    empresa,
    conteudo,
    logo,
  }) as unknown as Parameters<typeof renderToBuffer>[0];
  return renderToBuffer(elemento);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const orcamento = await getOrcamento(id);
  if (!orcamento) return new Response("Orçamento não encontrado", { status: 404 });

  const url = new URL(req.url);
  const conteudoParam = url.searchParams.get("conteudo") as ConteudoPdf | null;
  const conteudo = conteudoParam && CONTEUDOS.includes(conteudoParam) ? conteudoParam : "completo";
  const empresaKey: EmpresaKey =
    url.searchParams.get("empresa") === "sinalshop" ? "sinalshop" : "sinaltran";

  const buffer = await renderPdf(orcamento, conteudo, empresaKey);
  const nome = `Orcamento-${orcamento.numero}-${conteudo}-${empresaKey}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
