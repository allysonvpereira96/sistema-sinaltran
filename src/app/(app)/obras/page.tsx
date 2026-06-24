import { listObras } from "@/lib/actions/obras";
import { getEmpresaAtiva } from "@/lib/actions/empresas";
import { ObrasLista } from "./_components/obras-lista";

export const dynamic = "force-dynamic";

export default async function ObrasPage() {
  const [obras, empresa] = await Promise.all([listObras(), getEmpresaAtiva()]);
  return <ObrasLista obras={obras} empresaNome={empresa?.nome ?? null} />;
}
