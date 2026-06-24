import { listPedidos } from "@/lib/actions/compras";
import { PedidosLista } from "./_components/pedidos-lista";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compras · Produção" };

export default async function ComprasPage() {
  const pedidos = await listPedidos();
  return <PedidosLista pedidos={pedidos} />;
}
