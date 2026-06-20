import { notFound } from "next/navigation";
import { getOrdemServico } from "@/lib/actions/ordens-servico";
import { OSForm } from "../../_components/os-form";
import { carregarOpcoesOS } from "../../_components/opcoes";

export const dynamic = "force-dynamic";

export default async function EditarOSPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [os, opcoes] = await Promise.all([
    getOrdemServico(id),
    carregarOpcoesOS(),
  ]);
  if (!os) notFound();
  return <OSForm mode="edit" initialData={os} {...opcoes} />;
}
