import { Receipt } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export default function ContasPagarPage() {
  return (
    <ModulePlaceholder
      icon={Receipt}
      title="Contas a pagar"
      description="Compromissos com fornecedores, impostos e despesas operacionais."
      bullets={[
        "Lançamento de despesas e contas",
        "Vinculação a obra / centro de custo",
        "Fluxo de aprovação",
        "Programação de pagamentos",
      ]}
    />
  );
}
