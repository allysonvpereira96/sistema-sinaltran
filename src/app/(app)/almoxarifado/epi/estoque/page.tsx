import { listEpiCatalogo } from "@/lib/actions/epi";
import { EstoqueView } from "./_components/estoque-view";

export const metadata = { title: "Estoque de EPI · Almoxarifado" };

export default async function EstoqueEpiPage() {
  const itens = await listEpiCatalogo();
  return <EstoqueView itens={itens} />;
}
