"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { DataList } from "@/components/app/data-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClienteRow } from "@/lib/types/cliente";
import { setClienteAtivo } from "@/lib/actions/clientes";
import { formatCNPJ, formatTelefone } from "@/lib/format";

const BASE_PATH = "/cadastros/clientes";

const tipoPessoaLabel: Record<ClienteRow["tipo_pessoa"], string> = {
  juridica: "Jurídica",
  fisica: "Física",
  publico: "Órgão público",
};

const tipoPessoaTone: Record<ClienteRow["tipo_pessoa"], string> = {
  juridica: "bg-sky-50 text-sky-600",
  fisica: "bg-amber-50 text-amber-700",
  publico: "bg-violet-50 text-violet-600",
};

export function ClientesList({ items }: { items: ClienteRow[] }) {
  const router = useRouter();

  async function handleToggleAtivo(c: ClienteRow) {
    const acao = c.ativo ? "inativar" : "reativar";
    if (!confirm(`Deseja ${acao} o cliente "${c.razao_social}"?`)) return;
    const res = await setClienteAtivo(c.id, !c.ativo);
    if (res.ok) {
      toast.success(c.ativo ? "Cliente inativado" : "Cliente reativado");
      router.refresh();
    } else {
      toast.error("Erro ao atualizar", { description: res.error });
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Clientes"
        description="Contratantes das obras — prefeituras, órgãos públicos, construtoras e privados."
        actions={
          <Button onClick={() => router.push(`${BASE_PATH}/novo`)} className="gap-2">
            <Plus className="size-4" /> Novo cliente
          </Button>
        }
      />

      <DataList<ClienteRow>
        items={items}
        getRowKey={(c) => c.id}
        searchPlaceholder="Buscar razão social, CNPJ ou cidade…"
        searchFields={[
          "razao_social",
          "nome_fantasia",
          "cnpj_cpf",
          "cidade",
          "responsavel",
        ]}
        columns={[
          {
            key: "razao_social",
            header: "Cliente",
            cell: (c) => (
              <div>
                <div className="font-semibold">{c.razao_social}</div>
                <div className="text-xs text-muted-foreground">
                  {c.nome_fantasia ?? "—"} ·{" "}
                  {c.cnpj_cpf ? formatCNPJ(c.cnpj_cpf) : "sem CNPJ"}
                </div>
              </div>
            ),
          },
          {
            key: "tipo",
            header: "Tipo",
            cell: (c) => (
              <Badge
                variant="secondary"
                className={tipoPessoaTone[c.tipo_pessoa]}
              >
                {tipoPessoaLabel[c.tipo_pessoa]}
              </Badge>
            ),
          },
          {
            key: "localizacao",
            header: "Localização",
            cell: (c) =>
              c.cidade ? `${c.cidade} / ${c.estado ?? "—"}` : "—",
          },
          {
            key: "contato",
            header: "Contato",
            cell: (c) => (
              <div className="text-xs">
                <div>{c.responsavel ?? "—"}</div>
                <div className="text-muted-foreground">
                  {formatTelefone(c.telefone)}
                </div>
              </div>
            ),
          },
          {
            key: "ativo",
            header: "Status",
            cell: (c) =>
              c.ativo ? (
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
            onClick: (c) => router.push(`${BASE_PATH}/${c.id}/editar`),
          },
          {
            label: (c) => (c.ativo ? "Inativar" : "Reativar"),
            onClick: handleToggleAtivo,
            destructive: true,
          },
        ]}
      />
    </div>
  );
}
