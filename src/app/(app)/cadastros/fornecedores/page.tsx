"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { DataList } from "@/components/app/data-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FORNECEDORES, type Fornecedor } from "@/lib/mocks/cadastros";
import { formatCNPJ, formatTelefone } from "@/lib/format";

export default function FornecedoresPage() {
  const notImplemented = () =>
    toast.info("Em desenvolvimento", {
      description: "Esta ação será habilitada quando o Supabase estiver conectado.",
    });

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Fornecedores"
        description="Fornecedores de materiais e serviços — tinta, esferas, placas, equipamentos."
        actions={
          <Button onClick={notImplemented} className="gap-2">
            <Plus className="size-4" /> Novo fornecedor
          </Button>
        }
      />

      <DataList<Fornecedor>
        items={FORNECEDORES}
        getRowKey={(f) => f.id}
        searchPlaceholder="Buscar fornecedor, CNPJ ou cidade…"
        searchFields={["nome", "nome_fantasia", "cnpj_cpf", "cidade", "email"]}
        columns={[
          {
            key: "nome",
            header: "Fornecedor",
            cell: (f) => (
              <div>
                <div className="font-semibold">{f.nome}</div>
                <div className="text-xs text-muted-foreground">
                  {f.nome_fantasia ?? "—"} ·{" "}
                  {f.cnpj_cpf ? formatCNPJ(f.cnpj_cpf) : "sem CNPJ"}
                </div>
              </div>
            ),
          },
          {
            key: "localizacao",
            header: "Localização",
            cell: (f) =>
              f.cidade ? `${f.cidade} / ${f.estado ?? "—"}` : "—",
          },
          {
            key: "contato",
            header: "Contato",
            cell: (f) => (
              <div className="text-xs">
                <div>{f.email ?? "—"}</div>
                <div className="text-muted-foreground">
                  {formatTelefone(f.telefone)}
                </div>
              </div>
            ),
          },
          {
            key: "ativo",
            header: "Status",
            cell: (f) =>
              f.ativo ? (
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
          { label: "Histórico de compras", onClick: notImplemented },
          { label: "Inativar", onClick: notImplemented, destructive: true },
        ]}
      />
    </div>
  );
}
