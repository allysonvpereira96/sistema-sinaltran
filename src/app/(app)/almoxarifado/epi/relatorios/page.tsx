import { listColaboradores } from "@/lib/actions/colaboradores";
import { listEpiEntregas, listEpiCatalogo } from "@/lib/actions/epi";
import { RelatoriosView } from "./_components/relatorios-view";

export const metadata = { title: "Relatórios de EPI · Almoxarifado" };

export default async function RelatoriosEpiPage() {
  const [entregas, colaboradores, catalogo] = await Promise.all([
    listEpiEntregas(),
    listColaboradores(),
    listEpiCatalogo(),
  ]);
  const ativos = colaboradores
    .filter((c) => c.status !== "desligado")
    .map((c) => ({ id: c.id, nome: c.nome_completo, cargo: c.cargo, matricula: c.matricula }));
  return <RelatoriosView entregas={entregas} colaboradores={ativos} catalogo={catalogo} />;
}
