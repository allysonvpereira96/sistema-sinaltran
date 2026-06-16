"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { DataList } from "@/components/app/data-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UNIDADE_SERVICO_LABEL,
  type ServicoRow,
} from "@/lib/types/servico";
import { setServicoAtivo } from "@/lib/actions/servicos";
import { formatBRL } from "@/lib/format";

const BASE_PATH = "/cadastros/servicos";

export function ServicosList({ items }: { items: ServicoRow[] }) {
  const router = useRouter();

  async function handleToggleAtivo(s: ServicoRow) {
    const acao = s.ativo ? "inativar" : "reativar";
    if (!confirm(`Deseja ${acao} o serviço "${s.descricao}"?`)) return;
    const res = await setServicoAtivo(s.id, !s.ativo);
    if (res.ok) {
      toast.success(s.ativo ? "Serviço inativado" : "Serviço reativado");
      router.refresh();
    } else {
      toast.error("Erro ao atualizar", { description: res.error });
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Serviços"
        description="Catálogo de serviços prestados — com preço padrão por m² ou unidade e dados fiscais (LC 116 / ISS)."
        actions={
          <Button onClick={() => router.push(`${BASE_PATH}/novo`)} className="gap-2">
            <Plus className="size-4" /> Novo serviço
          </Button>
        }
      />

      <DataList<ServicoRow>
        items={items}
        getRowKey={(s) => s.id}
        searchPlaceholder="Buscar por código, descrição ou categoria…"
        searchFields={["codigo", "descricao", "categoria", "codigo_lc116"]}
        columns={[
          {
            key: "servico",
            header: "Serviço",
            cell: (s) => (
              <div>
                <div className="font-semibold">{s.descricao}</div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-mono">{s.codigo}</span>
                  {s.categoria ? ` · ${s.categoria}` : ""}
                </div>
              </div>
            ),
          },
          {
            key: "preco",
            header: "Preço padrão",
            cell: (s) =>
              s.preco_unitario > 0 ? (
                <div className="text-sm">
                  <span className="font-semibold tabular-nums">
                    {formatBRL(s.preco_unitario)}
                  </span>
                  {s.unidade_padrao ? (
                    <span className="text-muted-foreground">
                      {" "}
                      / {UNIDADE_SERVICO_LABEL[s.unidade_padrao] ?? s.unidade_padrao}
                    </span>
                  ) : null}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {s.unidade_padrao
                    ? `a definir / ${UNIDADE_SERVICO_LABEL[s.unidade_padrao] ?? s.unidade_padrao}`
                    : "a definir"}
                </span>
              ),
          },
          {
            key: "iss",
            header: "ISS",
            cell: (s) => (
              <div className="text-xs">
                <div className="tabular-nums">{s.aliquota_iss}%</div>
                <div className="text-muted-foreground">
                  {s.retem_iss ? "Retém na fonte" : "Sem retenção"}
                  {s.codigo_lc116 ? ` · LC ${s.codigo_lc116}` : ""}
                </div>
              </div>
            ),
          },
          {
            key: "ativo",
            header: "Status",
            cell: (s) =>
              s.ativo ? (
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-600">
                  Ativo
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  Inativo
                </Badge>
              ),
          },
        ]}
        actions={[
          {
            label: "Editar",
            onClick: (s) => router.push(`${BASE_PATH}/${s.id}/editar`),
          },
          {
            label: (s) => (s.ativo ? "Inativar" : "Reativar"),
            onClick: handleToggleAtivo,
            destructive: true,
          },
        ]}
      />
    </div>
  );
}
