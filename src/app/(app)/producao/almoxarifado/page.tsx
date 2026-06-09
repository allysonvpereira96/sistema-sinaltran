import { PackageSearch } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export default function AlmoxarifadoPage() {
  return (
    <ModulePlaceholder
      icon={PackageSearch}
      title="Almoxarifado"
      description="Controle de estoque de materiais e equipamentos, com movimentações por obra."
      bullets={[
        "Cadastro de itens (tinta, esferas, placas, tachas…)",
        "Entrada, saída e transferência",
        "Saldo por almoxarifado",
        "Reserva e requisição por obra",
      ]}
    />
  );
}
