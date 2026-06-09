import { FileText } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export default function OrcamentosPage() {
  return (
    <ModulePlaceholder
      icon={FileText}
      title="Orçamentos"
      description="Propostas comerciais em fluxo padronizado — itens, valores, prazos e condições — com funil de aprovação e histórico por cliente."
      bullets={[
        "Cadastro de propostas com itens e composições",
        "Funil de aprovação (aberto, enviado, aprovado, perdido)",
        "Histórico por cliente",
        "Conversão automática de proposta aprovada em obra",
      ]}
    />
  );
}
