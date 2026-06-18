import { NotebookPen } from "lucide-react";
import {
  listOcorrenciasCaderno,
  listColaboradoresParaCaderno,
} from "@/lib/actions/caderno-virtual";
import { listCentrosCusto } from "@/lib/actions/colaboradores";
import type { OcorrenciaTipo } from "@/lib/mocks/colaboradores";
import { CadernoVirtualView } from "./_components/caderno-virtual-view";

export const metadata = { title: "Caderno Virtual · Departamento Pessoal" };

type SearchParams = {
  ano?: string;
  mes?: string;
  tipo?: string;
  cc?: string;
};

function clampMes(n: number) {
  if (Number.isNaN(n) || n < 1) return 1;
  if (n > 12) return 12;
  return n;
}

function rangeDoMes(ano: number, mes: number) {
  // mes: 1..12 (uso interno deste componente)
  const inicio = new Date(Date.UTC(ano, mes - 1, 1));
  const fim = new Date(Date.UTC(ano, mes, 0));
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: toIso(inicio), fim: toIso(fim) };
}

export default async function CadernoVirtualPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const ano = Number(sp.ano) || now.getUTCFullYear();
  const mes = clampMes(Number(sp.mes) || now.getUTCMonth() + 1);
  const tipo = (sp.tipo as OcorrenciaTipo | "todos" | undefined) ?? "todos";
  const cc = sp.cc ?? "todos";

  const { inicio, fim } = rangeDoMes(ano, mes);

  const [ocorrencias, colaboradores, centros] = await Promise.all([
    listOcorrenciasCaderno({ inicio, fim, tipo, centroCustoId: cc }),
    listColaboradoresParaCaderno({ incluirInativos: false }),
    listCentrosCusto(),
  ]);

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <div className="size-11 rounded-xl bg-primary/10 grid place-items-center shrink-0">
          <NotebookPen className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            Caderno Virtual
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registro diário de ocorrências dos colaboradores — faltas,
            atestados, advertências, elogios e observações.
          </p>
        </div>
      </header>

      <CadernoVirtualView
        ano={ano}
        mes={mes}
        tipoFiltro={tipo}
        centroCustoFiltro={cc}
        ocorrencias={ocorrencias}
        colaboradores={colaboradores}
        centrosCusto={centros}
      />
    </div>
  );
}
