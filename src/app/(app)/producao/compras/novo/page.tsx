import { getEmpresaAtiva } from "@/lib/actions/empresas";
import { carregarOpcoesCompras } from "../_components/opcoes";
import { PedidoForm } from "../_components/pedido-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Novo pedido · Compras" };

export default async function NovoPedidoPage() {
  const [{ obras, materiais }, empresa] = await Promise.all([
    carregarOpcoesCompras(),
    getEmpresaAtiva(),
  ]);
  return (
    <PedidoForm obras={obras} materiais={materiais} empresaNome={empresa?.nome ?? null} />
  );
}
