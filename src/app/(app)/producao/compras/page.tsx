import { ShoppingCart } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export default function ComprasPage() {
  return (
    <ModulePlaceholder
      icon={ShoppingCart}
      title="Compras"
      description="Solicitações, cotações e pedidos de compra de materiais e serviços."
      bullets={[
        "Solicitação de compra (vinculada à obra)",
        "Cotação com fornecedores",
        "Pedido de compra e aprovação",
        "Recebimento e conferência",
      ]}
    />
  );
}
