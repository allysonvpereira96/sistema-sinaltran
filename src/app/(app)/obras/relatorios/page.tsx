import { getRelatorioOS } from "@/lib/actions/relatorios-os";
import { RelatoriosObraView } from "./_components/relatorios-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatórios de obra · Obras" };

type SearchParams = { inicio?: string; fim?: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);

function periodoPadrao() {
  const now = new Date();
  const inicio = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { inicio: iso(inicio), fim: iso(now) };
}

export default async function RelatoriosObraPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const padrao = periodoPadrao();
  const inicio = sp.inicio || padrao.inicio;
  const fim = sp.fim || padrao.fim;

  const relatorio = await getRelatorioOS({ inicio, fim });

  return <RelatoriosObraView relatorio={relatorio} />;
}
