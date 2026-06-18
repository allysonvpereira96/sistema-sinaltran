import { CalendarClock } from "lucide-react";
import {
  listVencimentos,
  listFeriasEmRisco,
} from "@/lib/actions/colaboradores";
import { formatDateBR } from "@/lib/format";
import type { VencimentoRow } from "@/lib/types/rh";
import { VencimentosLista } from "./_components/vencimentos-lista";

export const metadata = { title: "Vencimentos · Departamento Pessoal" };

function formatPeriodo(ini: string, fim: string) {
  return `${formatDateBR(ini)} → ${formatDateBR(fim)}`;
}

export default async function VencimentosPage() {
  const [rowsBase, ferias] = await Promise.all([
    listVencimentos(),
    listFeriasEmRisco(),
  ]);

  // Períodos aquisitivos viram linhas do tipo "Férias" (último dia para iniciar
  // o gozo sem gerar dobra) mescladas com os outros vencimentos. Quando o prazo
  // foi calculado pelo sistema (não vem do relatório oficial), marcamos com
  // "(calc.)" para o RH saber.
  const feriasRows: VencimentoRow[] = ferias
    .filter((f) => f.prazo_inicio_gozo != null)
    .map((f) => ({
      tipo: "Férias",
      registro_id: f.registro_id,
      colaborador_id: f.colaborador_id,
      colaborador: f.colaborador,
      setor: f.setor,
      descricao: `Iniciar gozo · aquisitivo ${formatPeriodo(
        f.aquisitivo_inicio,
        f.aquisitivo_fim,
      )} · ${Number(f.dias_direito).toLocaleString("pt-BR", {
        maximumFractionDigits: 2,
      })} dias${f.prazo_oficial ? "" : " (calc.)"}`,
      vencimento: f.prazo_inicio_gozo,
      dias_para_vencer: f.dias_para_dobra,
    }));

  const rows = [...rowsBase, ...feriasRows];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <div className="size-11 rounded-xl bg-primary/10 grid place-items-center shrink-0">
          <CalendarClock className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Vencimentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ASO, treinamentos e férias (incluindo prazo para dobra) — alertas a
            60 e 30 dias do vencimento.
          </p>
        </div>
      </header>

      <VencimentosLista rows={rows} />
    </div>
  );
}
