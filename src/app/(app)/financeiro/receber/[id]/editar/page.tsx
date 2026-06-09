import { notFound } from "next/navigation";
import { MEDICOES } from "@/lib/mocks/medicoes";
import { MedicaoForm } from "../../_components/medicao-form";

export default async function EditarMedicaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const medicao = MEDICOES.find((m) => m.id === id);
  if (!medicao) notFound();
  return <MedicaoForm mode="edit" initialData={medicao} />;
}
