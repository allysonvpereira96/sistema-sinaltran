import { listFornecedores } from "@/lib/actions/fornecedores";
import { FornecedoresList } from "./_components/fornecedores-list";

export const dynamic = "force-dynamic";

export default async function FornecedoresPage() {
  const fornecedores = await listFornecedores();
  return <FornecedoresList items={fornecedores} />;
}
