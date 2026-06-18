import { listColaboradores, listCentrosCusto } from "@/lib/actions/colaboradores";
import { listEmpresas } from "@/lib/actions/orcamentos";
import { getSalarioMinimo } from "@/lib/actions/parametros";
import { ColaboradoresLista } from "./_components/colaboradores-lista";

export default async function ColaboradoresPage() {
  const [colaboradores, centrosCusto, empresas, salarioMinimo] = await Promise.all([
    listColaboradores(),
    listCentrosCusto(),
    listEmpresas(),
    getSalarioMinimo(),
  ]);
  return (
    <ColaboradoresLista
      colaboradores={colaboradores}
      centrosCusto={centrosCusto}
      empresas={empresas}
      salarioMinimo={salarioMinimo}
    />
  );
}
