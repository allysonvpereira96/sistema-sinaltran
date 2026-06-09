"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { DataList } from "@/components/app/data-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EQUIPAMENTOS, type Equipamento } from "@/lib/mocks/cadastros";

const tipoLabel: Record<Equipamento["tipo"], string> = {
  veiculo: "Veículo",
  maquina_pintura: "Máquina de pintura",
  equipamento_auxiliar: "Equipamento auxiliar",
  ferramenta: "Ferramenta",
  outro: "Outro",
};

const statusLabel: Record<Equipamento["status"], string> = {
  disponivel: "Disponível",
  em_uso: "Em uso",
  manutencao: "Manutenção",
  inativo: "Inativo",
};

const statusTone: Record<Equipamento["status"], string> = {
  disponivel: "bg-emerald-50 text-emerald-600",
  em_uso: "bg-sky-50 text-sky-600",
  manutencao: "bg-amber-50 text-amber-700",
  inativo: "bg-muted text-muted-foreground",
};

export default function EquipamentosPage() {
  const notImplemented = () =>
    toast.info("Em desenvolvimento", {
      description: "Esta ação será habilitada quando o Supabase estiver conectado.",
    });

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Equipamentos"
        description="Frota e ativos operacionais — caminhões, máquinas de pintura, compressores e ferramentas."
        actions={
          <Button onClick={notImplemented} className="gap-2">
            <Plus className="size-4" /> Novo equipamento
          </Button>
        }
      />

      <DataList<Equipamento>
        items={EQUIPAMENTOS}
        getRowKey={(e) => e.id}
        searchPlaceholder="Buscar por código, descrição ou placa…"
        searchFields={["codigo", "descricao", "placa", "marca", "modelo"]}
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
                {tipoLabel[e.tipo]}
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
              <Badge variant="secondary" className={statusTone[e.status]}>
                {statusLabel[e.status]}
              </Badge>
            ),
          },
        ]}
        actions={[
          { label: "Editar", onClick: notImplemented },
          { label: "Histórico de alocação", onClick: notImplemented },
          { label: "Marcar como manutenção", onClick: notImplemented },
          { label: "Inativar", onClick: notImplemented, destructive: true },
        ]}
      />
    </div>
  );
}
