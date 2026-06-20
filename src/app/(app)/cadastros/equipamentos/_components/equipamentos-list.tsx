"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { DataList } from "@/components/app/data-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteEquipamento } from "@/lib/actions/equipamentos";
import {
  EQUIPAMENTO_TIPO_LABEL,
  EQUIPAMENTO_STATUS_LABEL,
  EQUIPAMENTO_STATUS_TONE,
  type EquipamentoRow,
} from "@/lib/types/equipamento";

const BASE_PATH = "/cadastros/equipamentos";

export function EquipamentosList({ items }: { items: EquipamentoRow[] }) {
  const router = useRouter();

  async function handleDelete(e: EquipamentoRow) {
    if (!confirm(`Excluir o equipamento "${e.descricao}"?`)) return;
    const res = await deleteEquipamento(e.id);
    if (res.ok) {
      toast.success("Equipamento excluído");
      router.refresh();
    } else {
      toast.error("Erro ao excluir", { description: res.error });
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Equipamentos"
        description="Frota e ativos operacionais — caminhões, máquinas de pintura, compressores e ferramentas."
        actions={
          <Button onClick={() => router.push(`${BASE_PATH}/novo`)} className="gap-2">
            <Plus className="size-4" /> Novo equipamento
          </Button>
        }
      />

      <DataList<EquipamentoRow>
        items={items}
        getRowKey={(e) => e.id}
        searchPlaceholder="Buscar por código, descrição ou placa…"
        searchFields={["codigo", "descricao", "placa", "marca", "modelo"]}
        emptyTitle="Nenhum equipamento"
        emptyDescription="Cadastre o primeiro veículo ou equipamento da frota."
        columns={[
          {
            key: "codigo",
            header: "Código",
            cell: (e) => (
              <span className="font-mono text-xs font-semibold text-foreground/80">
                {e.codigo}
              </span>
            ),
          },
          {
            key: "descricao",
            header: "Descrição",
            cell: (e) => (
              <div>
                <div className="font-medium">{e.descricao}</div>
                <div className="text-xs text-muted-foreground">
                  {[e.marca, e.modelo, e.ano].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
            ),
          },
          {
            key: "tipo",
            header: "Tipo",
            cell: (e) => (
              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                {EQUIPAMENTO_TIPO_LABEL[e.tipo]}
              </Badge>
            ),
          },
          {
            key: "placa",
            header: "Placa",
            cell: (e) =>
              e.placa ? (
                <span className="font-mono text-xs">{e.placa}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          },
          {
            key: "status",
            header: "Status",
            cell: (e) => (
              <Badge variant="secondary" className={EQUIPAMENTO_STATUS_TONE[e.status]}>
                {EQUIPAMENTO_STATUS_LABEL[e.status]}
              </Badge>
            ),
          },
        ]}
        actions={[
          { label: "Editar", onClick: (e) => router.push(`${BASE_PATH}/${e.id}/editar`) },
          { label: "Excluir", onClick: handleDelete, destructive: true },
        ]}
      />
    </div>
  );
}
