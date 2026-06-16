import { listServicos } from "@/lib/actions/servicos";
import { ServicosList } from "./_components/servicos-list";

export const dynamic = "force-dynamic";

export default async function ServicosPage() {
  const servicos = await listServicos();
  return <ServicosList items={servicos} />;
}
