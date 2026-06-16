import { notFound } from "next/navigation";
import { getObra } from "@/lib/actions/obras";
import { ObraForm } from "../../_components/obra-form";

export default async function EditarObraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const obra = await getObra(id);
  if (!obra) notFound();
  return <ObraForm mode="edit" initialData={obra} />;
}
