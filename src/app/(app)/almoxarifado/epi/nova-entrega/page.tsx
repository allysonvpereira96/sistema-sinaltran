import { listColaboradores } from "@/lib/actions/colaboradores";
import { listEpiCatalogo } from "@/lib/actions/epi";
import { NovaEntregaView } from "./_components/nova-entrega-view";

export const metadata = { title: "Nova entrega de EPI · Almoxarifado" };

export default async function NovaEntregaEpiPage() {
  const [colaboradores, itens] = await Promise.all([listColaboradores(), listEpiCatalogo()]);
  const ativos = colaboradores.filter((c) => c.status !== "desligado");
  return <NovaEntregaView colaboradores={ativos} itens={itens} />;
}
