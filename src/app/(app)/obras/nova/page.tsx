import { proximoNumeroObra } from "@/lib/actions/obras";
import { ObraForm } from "../_components/obra-form";

export const dynamic = "force-dynamic";

export default async function NovaObraPage() {
  const numero = await proximoNumeroObra();
  return <ObraForm mode="create" numeroSugerido={numero} />;
}
