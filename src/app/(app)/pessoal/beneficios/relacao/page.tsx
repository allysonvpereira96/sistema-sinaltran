import { listRelacaoMensal } from "@/lib/actions/beneficios";
import { RelacaoView } from "./_components/relacao-view";

export const metadata = { title: "Relação mensal · Benefícios" };

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function RelacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ competencia?: string }>;
}) {
  const sp = await searchParams;
  const competencia = sp.competencia && /^\d{4}-\d{2}$/.test(sp.competencia) ? sp.competencia : mesAtual();
  const { linhas, totais } = await listRelacaoMensal(competencia);
  return <RelacaoView competencia={competencia} linhas={linhas} totais={totais} />;
}
