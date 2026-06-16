import {
  listEmpresas,
  listMateriaisResumo,
  proximoNumero,
} from "@/lib/actions/orcamentos";
import { listServicosResumo } from "@/lib/actions/servicos";
import { OrcamentoForm } from "../_components/orcamento-form";

export const dynamic = "force-dynamic";

export default async function NovoOrcamentoPage() {
  const [empresas, materiais, servicos, numero] = await Promise.all([
    listEmpresas(),
    listMateriaisResumo(),
    listServicosResumo(),
    proximoNumero(),
  ]);
  return (
    <OrcamentoForm
      mode="create"
      empresas={empresas}
      materiais={materiais}
      servicos={servicos}
      numeroSugerido={numero}
    />
  );
}
