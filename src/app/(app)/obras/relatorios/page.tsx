import { ClipboardList } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export default function RelatoriosObrasPage() {
  return (
    <ModulePlaceholder
      icon={ClipboardList}
      title="Relatórios de obra"
      description="Registros diários, fotos, ocorrências e medições para acompanhamento e prestação de contas."
      bullets={[
        "Relatório diário de obra (RDO)",
        "Registro fotográfico",
        "Ocorrências e impedimentos",
        "Medições por etapa / serviço",
      ]}
    />
  );
}
