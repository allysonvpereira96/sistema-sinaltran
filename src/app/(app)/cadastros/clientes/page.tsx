import { listClientes } from "@/lib/actions/clientes";
import { ClientesList } from "./_components/clientes-list";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const clientes = await listClientes();
  return <ClientesList items={clientes} />;
}
