import { listCentrosCusto } from "@/lib/actions/colaboradores";
import { ColaboradorForm } from "../_components/colaborador-form";

export default async function NovoColaboradorPage() {
  const centrosCusto = await listCentrosCusto();
  return <ColaboradorForm mode="create" centrosCusto={centrosCusto} />;
}
