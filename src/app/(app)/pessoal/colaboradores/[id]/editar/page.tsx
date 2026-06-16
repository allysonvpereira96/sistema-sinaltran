import { notFound } from "next/navigation";
import { COLABORADORES } from "@/lib/mocks/colaboradores";
import { ColaboradorForm } from "../../_components/colaborador-form";

export default async function EditarColaboradorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const colaborador = COLABORADORES.find((c) => c.id === id);
  if (!colaborador) notFound();
  return <ColaboradorForm mode="edit" initialData={colaborador} />;
}
