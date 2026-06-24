import { notFound } from "next/navigation";
import { getPedido } from "@/lib/actions/compras";
import { listFornecedores } from "@/lib/actions/fornecedores";
import { PedidoDetalhe } from "../_components/pedido-detalhe";

export const dynamic = "force-dynamic";

export default async function PedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pedido, fornecedores] = await Promise.all([getPedido(id), listFornecedores()]);
  if (!pedido) notFound();

  return (
    <PedidoDetalhe
      pedido={pedido}
      fornecedores={fornecedores
        .filter((f) => f.ativo)
        .map((f) => ({ id: f.id, nome: f.nome, nome_fantasia: f.nome_fantasia }))}
    />
  );
}
