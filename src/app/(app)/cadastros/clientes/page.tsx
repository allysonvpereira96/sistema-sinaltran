"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { DataList } from "@/components/app/data-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CLIENTES, type Cliente } from "@/lib/mocks/cadastros";
import { formatCNPJ, formatTelefone } from "@/lib/format";

const tipoPessoaLabel: Record<Cliente["tipo_pessoa"], string> = {
  juridica: "Jurídica",
  fisica: "Física",
  publico: "Órgão público",
};

const tipoPessoaTone: Record<Cliente["tipo_pessoa"], string> = {
  juridica: "bg-sky-50 text-sky-600",
  fisica: "bg-amber-50 text-amber-700",
  publico: "bg-violet-50 text-violet-600",
};

export default function ClientesPage() {
  const notImplemented = () =>
    toast.info("Em desenvolvimento", {
      description: "Esta ação será habilitada quando o Supabase estiver conectado.",
    });

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Clientes"
        description="Contratantes das obras — prefeituras, órgãos públicos, construtoras e privados."
        actions={
          <Button onClick={notImplemented} className="gap-2">
            <Plus className="size-4" /> Novo cliente
          </Button>
        }
      />

      <DataList<Cliente>
        items={CLIENTES}
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
          { label: "Editar", onClick: notImplemented },
          { label: "Histórico de obras", onClick: notImplemented },
          { label: "Inativar", onClick: notImplemented, destructive: true },
        ]}
      />
    </div>
  );
}
