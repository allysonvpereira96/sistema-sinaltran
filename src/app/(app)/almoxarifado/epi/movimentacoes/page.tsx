import { listEpiMovimentacoes, listEpiCatalogo } from "@/lib/actions/epi";
import { MovimentacoesView } from "./_components/movimentacoes-view";

export const metadata = { title: "Movimentações de EPI · Almoxarifado" };

export default async function MovimentacoesEpiPage() {
  const [movimentacoes, itens] = await Promise.all([listEpiMovimentacoes(), listEpiCatalogo()]);
  return <MovimentacoesView movimentacoes={movimentacoes} itens={itens} />;
}
