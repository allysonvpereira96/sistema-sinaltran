import { notFound } from "next/navigation";
import { getFornecedorById } from "@/lib/actions/fornecedores";
import { FornecedorForm } from "../../_components/fornecedor-form";

export default async function EditarFornecedorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fornecedor = await getFornecedorById(id);
  if (!fornecedor) notFound();
  return <FornecedorForm mode="edit" initialData={fornecedor} />;
}
