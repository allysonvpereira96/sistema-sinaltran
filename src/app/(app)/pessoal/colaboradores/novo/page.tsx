import { listCentrosCusto } from "@/lib/actions/colaboradores";
import { listEmpresas } from "@/lib/actions/orcamentos";
import { ColaboradorForm } from "../_components/colaborador-form";

export default async function NovoColaboradorPage() {
  const [centrosCusto, empresas] = await Promise.all([listCentrosCusto(), listEmpresas()]);
  return <ColaboradorForm mode="create" centrosCusto={centrosCusto} empresas={empresas} />;
}
