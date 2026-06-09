import { Users } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export default function ColaboradoresPage() {
  return (
    <ModulePlaceholder
      icon={Users}
      title="Colaboradores"
      description="Cadastro completo da equipe — funções, habilidades, documentos e remuneração — com alocação por obra."
      bullets={[
        "Cadastro com função, documentos e habilidades",
        "Alocação por obra",
        "Controle de ponto e jornada",
        "Férias, EPI e produtividade individual",
      ]}
    />
  );
}
