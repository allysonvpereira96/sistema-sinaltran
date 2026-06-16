import { notFound } from "next/navigation";
import { getMaterialById } from "@/lib/actions/materiais";
import { MaterialForm } from "../../_components/material-form";

export default async function EditarMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const material = await getMaterialById(id);
  if (!material) notFound();
  return <MaterialForm mode="edit" initialData={material} />;
}
