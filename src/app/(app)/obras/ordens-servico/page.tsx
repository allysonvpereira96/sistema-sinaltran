import { listOrdensServico } from "@/lib/actions/ordens-servico";
import { OSLista } from "./_components/os-lista";

export const dynamic = "force-dynamic";

export default async function OrdensServicoPage() {
  const ordens = await listOrdensServico();
  return <OSLista ordens={ordens} />;
}
