import {
  listEstoqueMateriais,
  listMovimentacoesMateriais,
} from "@/lib/actions/almoxarifado-materiais";
import { AlmoxView } from "./_components/almox-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Almoxarifado de materiais · Produção" };

export default async function AlmoxarifadoPage() {
  const [estoque, movimentacoes] = await Promise.all([
    listEstoqueMateriais(),
    listMovimentacoesMateriais(100),
  ]);
  return <AlmoxView estoque={estoque} movimentacoes={movimentacoes} />;
}
