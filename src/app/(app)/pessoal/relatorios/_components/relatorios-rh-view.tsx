"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import type { Colaborador } from "@/lib/mocks/colaboradores";
import type { EmpresaResumo } from "@/lib/actions/orcamentos";
import { cn } from "@/lib/utils";
import { RelAniversariantes } from "./rel-aniversariantes";
import { RelQuadro } from "./rel-quadro";
import { RelAdmissoes } from "./rel-admissoes";
import { RelAbsenteismo } from "./rel-absenteismo";

const RELATORIOS = [
  { value: "aniversariantes", label: "Aniversariantes do mês" },
  { value: "quadro", label: "Quadro de pessoal" },
  { value: "absenteismo", label: "Absenteísmo (faltas/atrasos/atestados)" },
  { value: "admissoes", label: "Admissões & desligamentos" },
] as const;
type RelatorioTipo = (typeof RELATORIOS)[number]["value"];

export type RelatorioChildProps = {
  colaboradores: Colaborador[];
  empresaId: string;
  empresaById: Map<string, string>;
  multiEmpresa: boolean;
};

export function RelatoriosRhView({
  colaboradores,
  empresas,
}: {
  colaboradores: Colaborador[];
  empresas: EmpresaResumo[];
}) {
  const [relatorio, setRelatorio] = useState<RelatorioTipo>("aniversariantes");
  const [empresaId, setEmpresaId] = useState<string>("todas");

  const empresaById = useMemo(
    () => new Map(empresas.map((e) => [e.id, e.nome])),
    [empresas],
  );
  const multiEmpresa = empresas.length > 1;

  const childProps: RelatorioChildProps = {
    colaboradores,
    empresaId,
    empresaById,
    multiEmpresa,
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
      <PageHeader
        title="Relatórios"
        description="Relatórios do Departamento Pessoal extraídos do cadastro de colaboradores e do caderno virtual."
      />

      {/* Seletor de relatório + empresa (controles compartilhados) */}
      <Card className="print:hidden">
        <CardContent className="p-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Relatório
            </label>
            <select
              value={relatorio}
              onChange={(e) => setRelatorio(e.target.value as RelatorioTipo)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-72 block"
            >
              {RELATORIOS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {multiEmpresa && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empresa</span>
              <div className="inline-flex rounded-md border p-0.5">
                <button
                  type="button"
                  onClick={() => setEmpresaId("todas")}
                  className={cn("px-3 py-1.5 text-xs font-semibold rounded transition-colors", empresaId === "todas" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                >
                  Todas
                </button>
                {empresas.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setEmpresaId(e.id)}
                    className={cn("px-3 py-1.5 text-xs font-semibold rounded transition-colors", empresaId === e.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                  >
                    {e.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {relatorio === "aniversariantes" && <RelAniversariantes {...childProps} />}
      {relatorio === "quadro" && <RelQuadro {...childProps} />}
      {relatorio === "absenteismo" && <RelAbsenteismo {...childProps} />}
      {relatorio === "admissoes" && <RelAdmissoes {...childProps} />}
    </div>
  );
}
