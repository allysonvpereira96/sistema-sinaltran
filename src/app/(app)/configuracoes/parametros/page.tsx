import { listParametros } from "@/lib/actions/parametros";
import { ParametrosForm } from "./_components/parametros-form";

export default async function ParametrosPage() {
  const parametros = await listParametros();
  return <ParametrosForm parametros={parametros} />;
}
