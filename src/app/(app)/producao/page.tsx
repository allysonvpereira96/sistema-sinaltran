import { Factory } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export default function ProducaoPage() {
  return (
    <ModulePlaceholder
      icon={Factory}
      title="Produção"
      description="Gestão da produção e dos serviços executados — tinta, esferas, placas, colunas, tachas, semáforos e equipamentos de pintura."
      bullets={[
        "Ordens de produção por obra",
        "Quantidades planejadas x aplicadas",
        "Consumo de materiais",
        "Produtividade por equipe",
      ]}
    />
  );
}
