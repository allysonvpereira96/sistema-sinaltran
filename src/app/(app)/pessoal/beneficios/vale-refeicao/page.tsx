import { listVrCompetencia } from "@/lib/actions/beneficios";
import { VrView } from "./_components/vr-view";

export const metadata = { title: "Vale-refeição · Benefícios" };

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ValeRefeicaoPage({
  searchParams,
}: {
  searchParams: Promise<{ competencia?: string }>;
}) {
  const sp = await searchParams;
  const competencia = sp.competencia && /^\d{4}-\d{2}$/.test(sp.competencia) ? sp.competencia : mesAtual();
  const { config, linhas } = await listVrCompetencia(competencia);
  return <VrView competencia={competencia} config={config} linhas={linhas} />;
}
