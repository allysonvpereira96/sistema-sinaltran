import { BarChart3 } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export default function RelatoriosPage() {
  return (
    <ModulePlaceholder
      icon={BarChart3}
      title="Relatórios"
      description="Indicadores e exportações para acompanhamento gerencial. Definição dos relatórios na etapa de diagnóstico."
      bullets={[
        "Indicadores comerciais (taxa de conversão, ticket médio)",
        "Indicadores de obras (margem, prazo, capacidade)",
        "Indicadores financeiros (recebíveis, fluxo)",
        "Indicadores operacionais (produtividade, consumo)",
      ]}
    />
  );
}
