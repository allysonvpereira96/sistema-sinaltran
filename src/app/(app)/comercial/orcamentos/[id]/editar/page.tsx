import { notFound } from "next/navigation";
import { ORCAMENTOS } from "@/lib/mocks/orcamentos";
import { OrcamentoForm } from "../../_components/orcamento-form";

export default async function EditarOrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orcamento = ORCAMENTOS.find((o) => o.id === id);
  if (!orcamento) notFound();
  return <OrcamentoForm mode="edit" initialData={orcamento} />;
}
