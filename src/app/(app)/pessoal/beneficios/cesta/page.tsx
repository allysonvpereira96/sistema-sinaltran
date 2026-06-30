import { listCestaCompetencia } from "@/lib/actions/beneficios";
import { CestaView } from "./_components/cesta-view";

export const metadata = { title: "Cesta básica · Benefícios" };

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CestaPage({
  searchParams,
}: {
  searchParams: Promise<{ competencia?: string }>;
}) {
  const sp = await searchParams;
  const competencia = sp.competencia && /^\d{4}-\d{2}$/.test(sp.competencia) ? sp.competencia : mesAtual();
  const linhas = await listCestaCompetencia(competencia);
  return <CestaView competencia={competencia} linhas={linhas} />;
}
