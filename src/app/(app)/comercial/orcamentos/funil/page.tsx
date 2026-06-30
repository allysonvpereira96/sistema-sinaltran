import { listOrcamentos } from "@/lib/actions/orcamentos";
import { OrcamentosFunil } from "../_components/orcamentos-funil";

export const dynamic = "force-dynamic";

export default async function OrcamentosFunilPage() {
  const orcamentos = await listOrcamentos();
  return <OrcamentosFunil orcamentos={orcamentos} />;
}
