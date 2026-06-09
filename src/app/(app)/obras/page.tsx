import { HardHat } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export default function ObrasPage() {
  return (
    <ModulePlaceholder
      icon={HardHat}
      title="Obras"
      description="Painel único com todas as obras: escopo, prazos, responsáveis, equipe alocada, materiais e equipamentos."
      bullets={[
        "Listagem com filtros (status, tipo, cliente, prazo)",
        "Ficha completa por obra",
        "Previsto x realizado por serviço",
        "Custo, margem e capacidade",
      ]}
    />
  );
}
