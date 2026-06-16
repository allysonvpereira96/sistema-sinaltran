import { listObrasResumo } from "@/lib/actions/colaboradores";
import { ColaboradorForm } from "../_components/colaborador-form";

export default async function NovoColaboradorPage() {
  const obras = await listObrasResumo();
  return <ColaboradorForm mode="create" obras={obras} />;
}
