import { GraduationCap } from "lucide-react";
import { listTreinamentosCatalogo } from "@/lib/actions/colaboradores";
import { CatalogoLista } from "./_components/catalogo-lista";

export const metadata = { title: "Catálogo de treinamentos · Departamento Pessoal" };

export default async function TreinamentosCatalogoPage() {
  const itens = await listTreinamentosCatalogo(false);

  return (
    <div className="p-6 lg:p-8 max-w-[1100px] mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <div className="size-11 rounded-xl bg-primary/10 grid place-items-center shrink-0">
          <GraduationCap className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Catálogo de treinamentos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Lista de NRs e cursos com validade padrão — usada no cadastro de treinamentos do colaborador.
          </p>
        </div>
      </header>

      <CatalogoLista itens={itens} />
    </div>
  );
}
