import { notFound } from "next/navigation";
import { getMedicao, listObrasParaMedicao } from "@/lib/actions/medicoes";
import { MedicaoForm } from "../../_components/medicao-form";

export default async function EditarMedicaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [medicao, obras] = await Promise.all([
    getMedicao(id),
    listObrasParaMedicao(),
  ]);
  if (!medicao) notFound();
  return <MedicaoForm mode="edit" initialData={medicao} obras={obras} />;
}
