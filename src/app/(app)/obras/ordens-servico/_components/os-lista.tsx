"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { DataList } from "@/components/app/data-list";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { deleteOrdemServico } from "@/lib/actions/ordens-servico";
import { OS_STATUS_LABEL, OS_STATUS_TONE, type OSListRow } from "@/lib/types/os";
import { formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";

const obraNome = (o: OSListRow) => o.obra?.nome ?? "—";
const clienteNome = (o: OSListRow) =>
  o.cliente?.nome_fantasia ?? o.cliente?.razao_social ?? "—";

export function OSLista({ ordens }: { ordens: OSListRow[] }) {
  const router = useRouter();

  async function handleDelete(os: OSListRow) {
    if (
      !confirm(
        `Excluir a O.S ${os.numero}? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    const res = await deleteOrdemServico(os.id);
    if (res.ok) {
      toast.success("O.S excluída");
      router.refresh();
    } else {
      toast.error("Erro ao excluir", { description: res.error });
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Ordens de Serviço"
        description="O.S diária por equipe/trecho — preenchida pelo DP em conjunto com o supervisor, vinculada a uma obra."
        actions={
          <Link
            href="/obras/ordens-servico/nova"
            className={cn(buttonVariants({ size: "default" }), "gap-2")}
          >
            <Plus className="size-4" />
            Nova O.S
          </Link>
        }
      />

      <DataList<OSListRow>
        items={ordens}
        getRowKey={(o) => o.id}
        searchPlaceholder="Buscar por número, obra, cliente ou cidade…"
        searchFields={[
          "numero",
          (o) => obraNome(o),
          (o) => clienteNome(o),
          "cidade",
        ]}
        emptyTitle="Nenhuma ordem de serviço"
        emptyDescription="Crie a primeira O.S vinculada a uma obra."
        columns={[
          {
            key: "data",
            header: "Data",
            cell: (o) => (
              <span className="text-sm tabular-nums">{formatDateBR(o.data)}</span>
            ),
          },
          {
            key: "numero",
            header: "O.S",
            cell: (o) => (
              <span className="font-mono text-xs font-semibold text-foreground/80">
                {o.numero}
              </span>
            ),
          },
          {
            key: "obra",
            header: "Obra / Cliente",
            cell: (o) => (
              <div>
                <div className="font-medium">{obraNome(o)}</div>
                <div className="text-xs text-muted-foreground">{clienteNome(o)}</div>
              </div>
            ),
          },
          {
            key: "cidade",
            header: "Cidade",
            cell: (o) => o.cidade ?? <span className="text-muted-foreground">—</span>,
          },
          {
            key: "encarregado",
            header: "Encarregado",
            cell: (o) =>
              o.encarregado?.nome_completo ?? (
                <span className="text-muted-foreground">—</span>
              ),
          },
          {
            key: "status",
            header: "Status",
            cell: (o) => {
              const t = OS_STATUS_TONE[o.status];
              return (
                <Badge
                  variant="secondary"
                  className={cn("gap-1.5 font-medium", t.bg, t.text)}
                >
                  <span className={cn("size-1.5 rounded-full", t.dot)} />
                  {OS_STATUS_LABEL[o.status]}
                </Badge>
              );
            },
          },
        ]}
        actions={[
          { label: "Ver detalhes", onClick: (o) => router.push(`/obras/ordens-servico/${o.id}`) },
          { label: "Editar", onClick: (o) => router.push(`/obras/ordens-servico/${o.id}/editar`) },
          {
            label: "Imprimir O.S",
            onClick: (o) => window.open(`/obras/ordens-servico/${o.id}/pdf`, "_blank"),
          },
          { label: "Excluir", onClick: handleDelete, destructive: true },
        ]}
      />
    </div>
  );
}
