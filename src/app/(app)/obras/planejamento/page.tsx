import { CalendarRange } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export default function PlanejamentoPage() {
  return (
    <ModulePlaceholder
      icon={CalendarRange}
      title="Planejamento de obras"
      description="Cronograma e alocação de equipes, materiais e equipamentos por obra."
      bullets={[
        "Cronograma visual (timeline / kanban)",
        "Alocação de equipes e equipamentos",
        "Conflito de recursos entre obras",
        "Marcos e dependências",
      ]}
    />
  );
}
