import { listColaboradores, listCentrosCusto } from "@/lib/actions/colaboradores";
import { getSalarioMinimo } from "@/lib/actions/parametros";
import { ColaboradoresLista } from "./_components/colaboradores-lista";

export default async function ColaboradoresPage() {
  const [colaboradores, centrosCusto, salarioMinimo] = await Promise.all([
    listColaboradores(),
    listCentrosCusto(),
    getSalarioMinimo(),
  ]);
  return (
    <ColaboradoresLista
      colaboradores={colaboradores}
      centrosCusto={centrosCusto}
      salarioMinimo={salarioMinimo}
    />
  );
}
