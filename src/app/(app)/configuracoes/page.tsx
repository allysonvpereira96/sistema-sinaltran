import { Settings } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export default function ConfiguracoesPage() {
  return (
    <ModulePlaceholder
      icon={Settings}
      title="Configurações"
      description="Parâmetros do sistema, usuários, perfis de acesso e integrações."
      bullets={[
        "Usuários e perfis de acesso",
        "Parâmetros gerais da empresa",
        "Integrações (Supabase, e-mail, NF-e)",
        "Trilhas de auditoria",
      ]}
    />
  );
}
