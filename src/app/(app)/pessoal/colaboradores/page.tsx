import { listColaboradores, listCentrosCusto } from "@/lib/actions/colaboradores";
import { ColaboradoresLista } from "./_components/colaboradores-lista";

export default async function ColaboradoresPage() {
  const [colaboradores, centrosCusto] = await Promise.all([
    listColaboradores(),
    listCentrosCusto(),
  ]);
  return <ColaboradoresLista colaboradores={colaboradores} centrosCusto={centrosCusto} />;
}
