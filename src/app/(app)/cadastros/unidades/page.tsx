"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { DataList } from "@/components/app/data-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UNIDADES, type Unidade } from "@/lib/mocks/cadastros";
import { formatCNPJ } from "@/lib/format";

export default function UnidadesPage() {
  const notImplemented = () =>
    toast.info("Em desenvolvimento", {
      description: "Esta ação será habilitada quando o Supabase estiver conectado.",
    });

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Unidades"
        description="Filiais e empresas operacionais da Sinaltran."
        actions={
          <Button onClick={notImplemented} className="gap-2">
            <Plus className="size-4" /> Nova unidade
          </Button>
        }
      />

      <DataList<Unidade>
        items={UNIDADES}
        getRowKey={(u) => u.id}
        searchPlaceholder="Buscar unidade, responsável ou cidade…"
        searchFields={["nome", "responsavel", "cidade", "cnpj"]}
        columns={[
          {
            key: "nome",
            header: "Nome",
            cell: (u) => (
              <div>
                <div className="font-semibold">{u.nome}</div>
                {u.cnpj ? (
                  <div className="text-xs text-muted-foreground">
                    CNPJ {formatCNPJ(u.cnpj)}
                  </div>
                ) : null}
              </div>
            ),
          },
          {
            key: "responsavel",
            header: "Responsável",
            cell: (u) => u.responsavel ?? "—",
          },
          {
            key: "localizacao",
            header: "Localização",
            cell: (u) =>
              u.cidade ? `${u.cidade} / ${u.estado ?? "—"}` : "—",
          },
          {
            key: "ativo",
            header: "Status",
            cell: (u) =>
              u.ativo ? (
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-600">
                  Ativa
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  Inativa
                </Badge>
              ),
          },
        ]}
        actions={[
          { label: "Editar", onClick: notImplemented },
          { label: "Inativar", onClick: notImplemented, destructive: true },
        ]}
      />
    </div>
  );
}
