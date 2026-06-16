import { listOrcamentos } from "@/lib/actions/orcamentos";
import { OrcamentosLista } from "./_components/orcamentos-lista";

export const dynamic = "force-dynamic";

export default async function OrcamentosPage() {
  const orcamentos = await listOrcamentos();
  return <OrcamentosLista orcamentos={orcamentos} />;
}
