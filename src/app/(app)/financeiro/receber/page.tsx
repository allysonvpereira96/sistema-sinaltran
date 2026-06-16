import { listMedicoes } from "@/lib/actions/medicoes";
import { MedicoesLista } from "./_components/medicoes-lista";

export const dynamic = "force-dynamic";

export default async function MedicoesPage() {
  const medicoes = await listMedicoes();
  return <MedicoesLista medicoes={medicoes} />;
}
