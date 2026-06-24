import { listEpiEntregas } from "@/lib/actions/epi";
import { EntregasView } from "./_components/entregas-view";

export const metadata = { title: "Entregas de EPI · Almoxarifado" };

export default async function EntregasEpiPage() {
  const entregas = await listEpiEntregas();
  return <EntregasView entregas={entregas} />;
}
