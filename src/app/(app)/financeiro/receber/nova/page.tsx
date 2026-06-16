import { listObrasParaMedicao } from "@/lib/actions/medicoes";
import { MedicaoForm } from "../_components/medicao-form";

export const dynamic = "force-dynamic";

export default async function NovaMedicaoPage() {
  const obras = await listObrasParaMedicao();
  return <MedicaoForm mode="create" obras={obras} />;
}
