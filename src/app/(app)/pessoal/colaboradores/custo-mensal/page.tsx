import { listColaboradores, listCentrosCusto } from "@/lib/actions/colaboradores";
import { getSalarioMinimo } from "@/lib/actions/parametros";
import { CustoMensalRelatorio } from "./_components/custo-mensal-relatorio";

export default async function CustoMensalPage() {
  const [colaboradores, centrosCusto, salarioMinimo] = await Promise.all([
    listColaboradores(),
    listCentrosCusto(),
    getSalarioMinimo(),
  ]);
  const ativos = colaboradores.filter((c) => c.status === "ativo");
  return (
    <CustoMensalRelatorio
      colaboradores={ativos}
      centrosCusto={centrosCusto}
      salarioMinimo={salarioMinimo}
    />
  );
}
