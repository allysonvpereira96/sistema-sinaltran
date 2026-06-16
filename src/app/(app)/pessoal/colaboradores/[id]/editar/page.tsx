import { notFound } from "next/navigation";
import { getColaboradorById, listObrasResumo } from "@/lib/actions/colaboradores";
import { ColaboradorForm } from "../../_components/colaborador-form";

export default async function EditarColaboradorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [colaborador, obras] = await Promise.all([
    getColaboradorById(id),
    listObrasResumo(),
  ]);
  if (!colaborador) notFound();
  return <ColaboradorForm mode="edit" initialData={colaborador} obras={obras} />;
}
