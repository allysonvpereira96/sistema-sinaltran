import { Wallet } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export default function ContasReceberPage() {
  return (
    <ModulePlaceholder
      icon={Wallet}
      title="Contas a receber"
      description="Medições, faturamento e controles de recebíveis das obras contratadas."
      bullets={[
        "Medições por obra (boletim de medição)",
        "Geração de fatura / nota fiscal",
        "Controle de recebíveis e baixas",
        "Inadimplência e aging",
      ]}
    />
  );
}
