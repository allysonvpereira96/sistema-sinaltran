import { listEquipamentos } from "@/lib/actions/equipamentos";
import { EquipamentosList } from "./_components/equipamentos-list";

export const dynamic = "force-dynamic";

export default async function EquipamentosPage() {
  const items = await listEquipamentos();
  return <EquipamentosList items={items} />;
}
