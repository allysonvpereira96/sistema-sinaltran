import { notFound } from "next/navigation";
import { getServicoById } from "@/lib/actions/servicos";
import { ServicoForm } from "../../_components/servico-form";

export default async function EditarServicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const servico = await getServicoById(id);
  if (!servico) notFound();
  return <ServicoForm mode="edit" initialData={servico} />;
}
