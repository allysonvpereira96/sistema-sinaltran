import {
  listEmpresas,
  listMateriaisResumo,
  proximoNumero,
} from "@/lib/actions/orcamentos";
import { OrcamentoForm } from "../_components/orcamento-form";

export const dynamic = "force-dynamic";

export default async function NovoOrcamentoPage() {
  const [empresas, materiais, numero] = await Promise.all([
    listEmpresas(),
    listMateriaisResumo(),
    proximoNumero(),
  ]);
  return (
    <OrcamentoForm
      mode="create"
      empresas={empresas}
      materiais={materiais}
      numeroSugerido={numero}
    />
  );
}
