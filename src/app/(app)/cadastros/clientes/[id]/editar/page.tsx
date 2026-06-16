import { notFound } from "next/navigation";
import { getClienteById } from "@/lib/actions/clientes";
import { ClienteForm } from "../../_components/cliente-form";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await getClienteById(id);
  if (!cliente) notFound();
  return <ClienteForm mode="edit" initialData={cliente} />;
}
