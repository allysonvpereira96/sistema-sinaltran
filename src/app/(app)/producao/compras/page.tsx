import { listPedidos } from "@/lib/actions/compras";
import { getEmpresaAtiva } from "@/lib/actions/empresas";
import { PedidosLista } from "./_components/pedidos-lista";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compras · Produção" };

export default async function ComprasPage() {
  const [pedidos, empresa] = await Promise.all([listPedidos(), getEmpresaAtiva()]);
  return <PedidosLista pedidos={pedidos} empresaNome={empresa?.nome ?? null} />;
}
