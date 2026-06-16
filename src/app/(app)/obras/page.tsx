import { listObras } from "@/lib/actions/obras";
import { ObrasLista } from "./_components/obras-lista";

export const dynamic = "force-dynamic";

export default async function ObrasPage() {
  const obras = await listObras();
  return <ObrasLista obras={obras} />;
}
