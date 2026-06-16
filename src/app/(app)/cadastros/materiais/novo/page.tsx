import { sugerirCodigoMaterial } from "@/lib/actions/materiais";
import { MaterialForm } from "../_components/material-form";

export const dynamic = "force-dynamic";

export default async function NovoMaterialPage() {
  const codigo = await sugerirCodigoMaterial();
  return <MaterialForm mode="create" codigoSugerido={codigo} />;
}
