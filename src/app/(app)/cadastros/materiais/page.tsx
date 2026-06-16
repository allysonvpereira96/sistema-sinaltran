import { listMateriais } from "@/lib/actions/materiais";
import { MateriaisList } from "./_components/materiais-list";

export const dynamic = "force-dynamic";

export default async function MateriaisPage() {
  const materiais = await listMateriais();
  return <MateriaisList items={materiais} />;
}
