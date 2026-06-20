import { proximoNumeroOS } from "@/lib/actions/ordens-servico";
import { OSForm } from "../_components/os-form";
import { carregarOpcoesOS } from "../_components/opcoes";

export const dynamic = "force-dynamic";

export default async function NovaOSPage() {
  const [numero, opcoes] = await Promise.all([
    proximoNumeroOS(),
    carregarOpcoesOS(),
  ]);
  return <OSForm mode="create" numeroSugerido={numero} {...opcoes} />;
}
