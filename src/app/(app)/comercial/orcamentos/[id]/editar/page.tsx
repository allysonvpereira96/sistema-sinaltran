import { notFound } from "next/navigation";
import {
  getOrcamento,
  listEmpresas,
  listMateriaisResumo,
} from "@/lib/actions/orcamentos";
import { OrcamentoForm } from "../../_components/orcamento-form";

export default async function EditarOrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [orcamento, empresas, materiais] = await Promise.all([
    getOrcamento(id),
    listEmpresas(),
    listMateriaisResumo(),
  ]);
  if (!orcamento) notFound();
  return (
    <OrcamentoForm
      mode="edit"
      initialData={orcamento}
      empresas={empresas}
      materiais={materiais}
    />
  );
}
