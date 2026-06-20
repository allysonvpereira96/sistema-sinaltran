import { notFound } from "next/navigation";
import { getEquipamento } from "@/lib/actions/equipamentos";
import { EquipamentoForm } from "../../_components/equipamento-form";

export const dynamic = "force-dynamic";

export default async function EditarEquipamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const equipamento = await getEquipamento(id);
  if (!equipamento) notFound();
  return <EquipamentoForm mode="edit" initialData={equipamento} />;
}
