import {
  listColaboradores,
  listVencimentos,
  listFeriasEmRisco,
  listEmergenciasGeral,
} from "@/lib/actions/colaboradores";
import { listEmpresas } from "@/lib/actions/orcamentos";
import { RelatoriosRhView } from "./_components/relatorios-rh-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Relatórios · Departamento Pessoal" };

export default async function RelatoriosRhPage() {
  const [colaboradores, empresas, vencimentos, feriasRisco, emergencias] = await Promise.all([
    listColaboradores(),
    listEmpresas(),
    listVencimentos(),
    listFeriasEmRisco(),
    listEmergenciasGeral(),
  ]);

  return (
    <RelatoriosRhView
      colaboradores={colaboradores}
      empresas={empresas}
      vencimentos={vencimentos}
      feriasRisco={feriasRisco}
      emergencias={emergencias}
    />
  );
}
