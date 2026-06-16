import { sugerirCodigoServico } from "@/lib/actions/servicos";
import { ServicoForm } from "../_components/servico-form";

export const dynamic = "force-dynamic";

export default async function NovoServicoPage() {
  const codigo = await sugerirCodigoServico();
  return <ServicoForm mode="create" codigoSugerido={codigo} />;
}
