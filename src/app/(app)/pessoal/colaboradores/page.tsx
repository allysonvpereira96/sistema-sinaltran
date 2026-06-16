import { listColaboradores, listObrasResumo } from "@/lib/actions/colaboradores";
import { ColaboradoresLista } from "./_components/colaboradores-lista";

export default async function ColaboradoresPage() {
  const [colaboradores, obras] = await Promise.all([
    listColaboradores(),
    listObrasResumo(),
  ]);
  return <ColaboradoresLista colaboradores={colaboradores} obras={obras} />;
}
