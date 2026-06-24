"use client";

import { useMemo } from "react";
import { Users, UserCheck, Plane, HeartPulse, Printer, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RelatorioChildProps } from "./relatorios-rh-view";
import { escopoEmpresa, baixarCSV } from "./relatorios-utils";
import { KpiCard } from "./rel-kpi";

function agrupar(colaboradores: { chave: string }[]): { chave: string; qtd: number }[] {
  const map = new Map<string, number>();
  for (const c of colaboradores) map.set(c.chave, (map.get(c.chave) ?? 0) + 1);
  return [...map.entries()]
    .map(([chave, qtd]) => ({ chave, qtd }))
    .sort((a, b) => b.qtd - a.qtd || a.chave.localeCompare(b.chave));
}

function Quebra({ titulo, rows }: { titulo: string; rows: { chave: string; qtd: number }[] }) {
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{titulo}</TableHead>
              <TableHead className="text-right w-24">Qtd.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-8">Sem dados.</TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.chave}>
                  <TableCell className="text-sm">{r.chave}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{r.qtd}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function RelQuadro({ colaboradores, empresaId, empresaById, multiEmpresa }: RelatorioChildProps) {
  // Quadro = efetivo atual (exclui desligados)
  const escopo = useMemo(
    () => escopoEmpresa(colaboradores, empresaId).filter((c) => c.status !== "desligado"),
    [colaboradores, empresaId],
  );

  const kpis = useMemo(
    () => ({
      total: escopo.length,
      ativos: escopo.filter((c) => c.status === "ativo").length,
      ferias: escopo.filter((c) => c.status === "ferias").length,
      afastados: escopo.filter((c) => c.status === "afastado").length,
    }),
    [escopo],
  );

  const porCargo = useMemo(() => agrupar(escopo.map((c) => ({ chave: c.cargo || "—" }))), [escopo]);
  const porSetor = useMemo(() => agrupar(escopo.map((c) => ({ chave: c.setor || "—" }))), [escopo]);
  const porEmpresa = useMemo(
    () => agrupar(escopo.map((c) => ({ chave: c.empresa_id ? empresaById.get(c.empresa_id) ?? "—" : "—" }))),
    [escopo, empresaById],
  );
  const mostrarEmpresa = multiEmpresa && empresaId === "todas";

  function exportar() {
    const rows: (string | number)[][] = [];
    rows.push(["Por cargo", ""]);
    porCargo.forEach((r) => rows.push([r.chave, r.qtd]));
    rows.push(["", ""]);
    rows.push(["Por setor", ""]);
    porSetor.forEach((r) => rows.push([r.chave, r.qtd]));
    if (mostrarEmpresa) {
      rows.push(["", ""]);
      rows.push(["Por empresa", ""]);
      porEmpresa.forEach((r) => rows.push([r.chave, r.qtd]));
    }
    baixarCSV("quadro-de-pessoal.csv", ["Categoria", "Quantidade"], rows);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Quadro de pessoal</h2>
          <p className="text-sm text-muted-foreground">Efetivo atual (exclui desligados).</p>
        </div>
        <Button variant="outline" className="gap-2 print:hidden" onClick={exportar} disabled={escopo.length === 0}>
          <Download className="size-4" /> Exportar CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Efetivo total" value={kpis.total} icon={Users} />
        <KpiCard label="Ativos" value={kpis.ativos} icon={UserCheck} />
        <KpiCard label="Em férias" value={kpis.ferias} icon={Plane} />
        <KpiCard label="Afastados" value={kpis.afastados} icon={HeartPulse} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Quebra titulo="Por cargo" rows={porCargo} />
        <Quebra titulo="Por setor" rows={porSetor} />
      </div>

      {mostrarEmpresa && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Quebra titulo="Por empresa" rows={porEmpresa} />
        </div>
      )}

      <div className="flex justify-end print:hidden">
        <Button variant="outline" className="gap-2" onClick={() => window.print()} disabled={escopo.length === 0}>
          <Printer className="size-4" /> Imprimir / PDF
        </Button>
      </div>
    </div>
  );
}
