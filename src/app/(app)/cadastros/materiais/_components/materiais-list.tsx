"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { DataList } from "@/components/app/data-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MaterialRow } from "@/lib/types/material";
import { setMaterialAtivo } from "@/lib/actions/materiais";
import { formatBRL } from "@/lib/format";

const BASE_PATH = "/cadastros/materiais";

export function MateriaisList({
  items,
  empresaNome,
}: {
  items: MaterialRow[];
  empresaNome?: string | null;
}) {
  const router = useRouter();

  async function handleToggleAtivo(m: MaterialRow) {
    const acao = m.ativo ? "inativar" : "reativar";
    if (!confirm(`Deseja ${acao} o material "${m.descricao}"?`)) return;
    const res = await setMaterialAtivo(m.id, !m.ativo);
    if (res.ok) {
      toast.success(m.ativo ? "Material inativado" : "Material reativado");
      router.refresh();
    } else {
      toast.error("Erro ao atualizar", { description: res.error });
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
      <PageHeader
        title={empresaNome ? `Materiais · ${empresaNome}` : "Materiais"}
        description="Catálogo de produtos da empresa ativa: placas, tachões, tinta, defensa e demais materiais — com preço de material e de instalação."
        actions={
          <Button onClick={() => router.push(`${BASE_PATH}/novo`)} className="gap-2">
            <Plus className="size-4" /> Novo material
          </Button>
        }
      />

      <DataList<MaterialRow>
        items={items}
        getRowKey={(m) => m.id}
        searchPlaceholder="Buscar por código, descrição ou família…"
        searchFields={["codigo", "descricao", "familia", "ncm"]}
        columns={[
          {
            key: "descricao",
            header: "Material",
            cell: (m) => (
              <div>
                <div className="font-medium">{m.descricao}</div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-mono">{m.codigo ?? "—"}</span>
                  {m.familia ? ` · ${m.familia}` : ""}
                </div>
              </div>
            ),
          },
          {
            key: "unidade",
            header: "Un.",
            cell: (m) => (
              <span className="text-xs uppercase tracking-wider">
                {m.unidade_medida}
              </span>
            ),
            align: "center",
          },
          {
            key: "material",
            header: "Material",
            cell: (m) =>
              m.valor_referencia > 0 ? (
                <span className="tabular-nums">{formatBRL(m.valor_referencia)}</span>
              ) : (
                <span className="text-xs text-muted-foreground">a definir</span>
              ),
            align: "right",
          },
          {
            key: "instalacao",
            header: "Instalação",
            cell: (m) =>
              m.valor_mao_obra > 0 ? (
                <span className="tabular-nums">{formatBRL(m.valor_mao_obra)}</span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              ),
            align: "right",
          },
          {
            key: "ativo",
            header: "Status",
            cell: (m) =>
              m.ativo ? (
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
            onClick: (m) => router.push(`${BASE_PATH}/${m.id}/editar`),
          },
          {
            label: (m) => (m.ativo ? "Inativar" : "Reativar"),
            onClick: handleToggleAtivo,
            destructive: true,
          },
        ]}
      />
    </div>
  );
}
