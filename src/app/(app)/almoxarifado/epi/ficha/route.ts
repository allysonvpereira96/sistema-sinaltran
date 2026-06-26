import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getColaboradorById } from "@/lib/actions/colaboradores";
import { listEpiFichaItens } from "@/lib/actions/epi";
import { createClient } from "@/lib/supabase/server";
import { FichaEpiDocument } from "@/lib/pdf/epi-ficha-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const colaboradorId = url.searchParams.get("colaborador") ?? "";
  // ?todos=1 inclui também os já devolvidos; por padrão só os em uso
  const somenteEmUso = url.searchParams.get("todos") !== "1";

  if (!colaboradorId) return new Response("Colaborador não informado.", { status: 400 });

  const [colaborador, itens] = await Promise.all([
    getColaboradorById(colaboradorId),
    listEpiFichaItens(colaboradorId, somenteEmUso),
  ]);
  if (!colaborador) return new Response("Colaborador não encontrado.", { status: 404 });

  const hoje = new Date();
  const emissao = `${String(hoje.getDate()).padStart(2, "0")}/${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;

  // converte o path da assinatura em URL pública (bucket público) para embutir no PDF
  const supabase = await createClient();
  const itensDoc = itens.map((it) => ({
    data_entrega: it.data_entrega,
    data_devolucao: it.data_devolucao,
    quantidade: it.quantidade,
    nome: it.nome,
    ca: it.ca,
    assinatura_img:
      it.assinado && it.assinatura_url
        ? supabase.storage.from("assinaturas-epi").getPublicUrl(it.assinatura_url).data.publicUrl
        : null,
  }));

  const elemento = createElement(FichaEpiDocument, {
    empregado: colaborador.nome_completo,
    funcao: colaborador.cargo,
    admissao: colaborador.data_admissao,
    itens: itensDoc,
    emissao,
  }) as unknown as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(elemento);

  const slug = colaborador.nome_completo.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  const nome = `Ficha-EPI-${slug}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
