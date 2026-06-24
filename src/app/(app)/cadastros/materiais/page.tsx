import { listMateriais } from "@/lib/actions/materiais";
import { getEmpresaAtiva } from "@/lib/actions/empresas";
import { MateriaisList } from "./_components/materiais-list";

export const dynamic = "force-dynamic";

export default async function MateriaisPage() {
  const [materiais, empresa] = await Promise.all([listMateriais(), getEmpresaAtiva()]);
  return <MateriaisList items={materiais} empresaNome={empresa?.nome ?? null} />;
}
