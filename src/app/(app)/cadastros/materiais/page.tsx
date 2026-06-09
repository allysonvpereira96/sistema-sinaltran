"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { DataList } from "@/components/app/data-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MATERIAIS, type Material } from "@/lib/mocks/cadastros";
import { formatBRL, formatNumber } from "@/lib/format";

const categoriaLabel: Record<Material["categoria"], string> = {
  tinta: "Tinta",
  esfera_vidro: "Esfera de vidro",
  placa: "Placa",
  coluna: "Coluna",
  tacha: "Tacha",
  semaforo: "Semáforo",
  pelicula: "Película",
  diluente: "Diluente",
  fixador: "Fixador",
  outro: "Outro",
};

const categoriaTone: Record<Material["categoria"], string> = {
  tinta: "bg-sky-50 text-sky-600",
  esfera_vidro: "bg-cyan-50 text-cyan-600",
  placa: "bg-amber-50 text-amber-700",
  coluna: "bg-slate-100 text-slate-700",
  tacha: "bg-violet-50 text-violet-600",
  semaforo: "bg-emerald-50 text-emerald-600",
  pelicula: "bg-rose-50 text-rose-600",
  diluente: "bg-orange-50 text-orange-700",
  fixador: "bg-lime-50 text-lime-700",
  outro: "bg-muted text-muted-foreground",
};

export default function MateriaisPage() {
  const notImplemented = () =>
    toast.info("Em desenvolvimento", {
      description: "Esta ação será habilitada quando o Supabase estiver conectado.",
    });

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Materiais"
        description="Catálogo de insumos: tinta, esferas, placas, colunas, tachas, semáforos e demais materiais."
        actions={
          <Button onClick={notImplemented} className="gap-2">
            <Plus className="size-4" /> Novo material
          </Button>
        }
      />

      <DataList<Material>
        items={MATERIAIS}
        getRowKey={(m) => m.id}
        searchPlaceholder="Buscar por código ou descrição…"
        searchFields={["codigo", "descricao"]}
        columns={[
          {
            key: "codigo",
            header: "Código",
            cell: (m) => (
              <span className="font-mono text-xs font-semibold text-foreground/80">
                {m.codigo}
              </span>
            ),
          },
          {
            key: "descricao",
            header: "Descrição",
            cell: (m) => <span className="font-medium">{m.descricao}</span>,
          },
          {
            key: "categoria",
            header: "Categoria",
            cell: (m) => (
              <Badge variant="secondary" className={categoriaTone[m.categoria]}>
                {categoriaLabel[m.categoria]}
              </Badge>
            ),
          },
          {
            key: "unidade",
            header: "Unidade",
            cell: (m) => (
              <span className="text-xs uppercase tracking-wider">
                {m.unidade_medida}
              </span>
            ),
            align: "center",
          },
          {
            key: "valor",
            header: "Valor ref.",
            cell: (m) => formatBRL(m.valor_referencia),
            align: "right",
          },
          {
            key: "estoque_minimo",
            header: "Estoque mín.",
            cell: (m) => (
              <span className="text-xs">
                {formatNumber(m.estoque_minimo)} {m.unidade_medida}
              </span>
            ),
            align: "right",
          },
        ]}
        actions={[
          { label: "Editar", onClick: notImplemented },
          { label: "Ver movimentações", onClick: notImplemented },
          { label: "Inativar", onClick: notImplemented, destructive: true },
        ]}
      />
    </div>
  );
}
