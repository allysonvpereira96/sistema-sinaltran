import { carregarOpcoesCompras } from "../_components/opcoes";
import { PedidoForm } from "../_components/pedido-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Novo pedido · Compras" };

export default async function NovoPedidoPage() {
  const { obras, colaboradores, materiais } = await carregarOpcoesCompras();
  return (
    <PedidoForm obras={obras} colaboradores={colaboradores} materiais={materiais} />
  );
}
