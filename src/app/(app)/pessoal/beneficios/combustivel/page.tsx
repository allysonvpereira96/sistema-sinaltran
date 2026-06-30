import { listCombustivelCompetencia } from "@/lib/actions/beneficios";
import { CombustivelView } from "./_components/combustivel-view";

export const metadata = { title: "Combustível · Benefícios" };

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CombustivelPage({
  searchParams,
}: {
  searchParams: Promise<{ competencia?: string }>;
}) {
  const sp = await searchParams;
  const competencia = sp.competencia && /^\d{4}-\d{2}$/.test(sp.competencia) ? sp.competencia : mesAtual();
  const { config, linhas } = await listCombustivelCompetencia(competencia);
  return <CombustivelView competencia={competencia} config={config} linhas={linhas} />;
}
