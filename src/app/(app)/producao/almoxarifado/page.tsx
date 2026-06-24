import {
  listEstoqueMateriais,
  listMovimentacoesMateriais,
} from "@/lib/actions/almoxarifado-materiais";
import { getEmpresaAtiva } from "@/lib/actions/empresas";
import { AlmoxView } from "./_components/almox-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Almoxarifado de materiais · Produção" };

export default async function AlmoxarifadoPage() {
  const [estoque, movimentacoes, empresa] = await Promise.all([
    listEstoqueMateriais(),
    listMovimentacoesMateriais(100),
    getEmpresaAtiva(),
  ]);
  return (
    <AlmoxView
      estoque={estoque}
      movimentacoes={movimentacoes}
      empresaNome={empresa?.nome ?? null}
    />
  );
}
