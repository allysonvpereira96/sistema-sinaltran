import { notFound } from "next/navigation";
import { OBRAS } from "@/lib/mocks/obras";
import { ObraForm } from "../../_components/obra-form";

export default async function EditarObraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const obra = OBRAS.find((o) => o.id === id);
  if (!obra) notFound();
  return <ObraForm mode="edit" initialData={obra} />;
}
