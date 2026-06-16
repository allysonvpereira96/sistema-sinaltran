import { CalendarClock } from "lucide-react";
import { listVencimentos } from "@/lib/actions/colaboradores";
import { VencimentosLista } from "./_components/vencimentos-lista";

export const metadata = { title: "Vencimentos · Departamento Pessoal" };

export default async function VencimentosPage() {
  const rows = await listVencimentos();

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <div className="size-11 rounded-xl bg-primary/10 grid place-items-center shrink-0">
          <CalendarClock className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Vencimentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ASO, treinamentos e férias — alertas a 60 e 30 dias do vencimento.
          </p>
        </div>
      </header>

      <VencimentosLista rows={rows} />
    </div>
  );
}
