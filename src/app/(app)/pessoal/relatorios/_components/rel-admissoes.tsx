"use client";

import { useMemo, useState } from "react";
import { UserPlus, UserMinus, TrendingUp, Printer, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateBR } from "@/lib/format";
import type { RelatorioChildProps } from "./relatorios-rh-view";
import { escopoEmpresa, baixarCSV, inicioAnoISO, hojeISO } from "./relatorios-utils";
import { KpiCard } from "./rel-kpi";

const emRange = (d: string | null, ini: string, fim: string) => !!d && d >= ini && d <= fim;

export function RelAdmissoes({ colaboradores, empresaId, empresaById, multiEmpresa }: RelatorioChildProps) {
  const [inicio, setInicio] = useState(inicioAnoISO());
  const [fim, setFim] = useState(hojeISO());

  const escopo = useMemo(() => escopoEmpresa(colaboradores, empresaId), [colaboradores, empresaId]);
  const empresaNome = (id?: string | null) => (id ? empresaById.get(id) ?? "—" : "—");

  const admitidos = useMemo(
    () =>
      escopo
        .filter((c) => emRange(c.data_admissao, inicio, fim))
        .map((c) => ({ id: c.id, data: c.data_admissao, nome: c.nome_completo, cargo: c.cargo, empresa: empresaNome(c.empresa_id) }))
        .sort((a, b) => b.data.localeCompare(a.data)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [escopo, inicio, fim],
  );

  const desligados = useMemo(
    () =>
      escopo
        .filter((c) => emRange(c.data_desligamento ?? null, inicio, fim))
        .map((c) => ({
          id: c.id,
          data: c.data_desligamento as string,
          nome: c.nome_completo,
          cargo: c.cargo,
          motivo: c.motivo_desligamento ?? "—",
          empresa: empresaNome(c.empresa_id),
        }))
        .sort((a, b) => b.data.localeCompare(a.data)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [escopo, inicio, fim],
  );

  const efetivo = useMemo(() => escopo.filter((c) => c.status !== "desligado").length, [escopo]);
  const rotatividade =
    efetivo > 0 ? (((admitidos.length + desligados.length) / 2 / efetivo) * 100).toFixed(1) : "—";

  function exportar() {
    const rows: (string | number)[][] = [];
    rows.push(["ADMISSÕES", "", "", ""]);
    admitidos.forEach((a) => rows.push([formatDateBR(a.data), a.nome, a.cargo, multiEmpresa ? a.empresa : ""]));
    rows.push(["", "", "", ""]);
    rows.push(["DESLIGAMENTOS", "", "", ""]);
    desligados.forEach((d) => rows.push([formatDateBR(d.data), d.nome, `${d.cargo} — ${d.motivo}`, multiEmpresa ? d.empresa : ""]));
    baixarCSV(`movimentacao-${inicio}-a-${fim}.csv`, ["Data", "Nome", "Cargo / Motivo", "Empresa"], rows);
  }

  return (
    <div className="space-y-6">
      <Card className="print:hidden">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Início</label>
            <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Fim</label>
            <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="w-40" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={exportar} disabled={admitidos.length === 0 && desligados.length === 0}>
              <Download className="size-4" /> Exportar CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => window.print()} disabled={admitidos.length === 0 && desligados.length === 0}>
              <Printer className="size-4" /> Imprimir / PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Admissões" value={admitidos.length} icon={UserPlus} />
        <KpiCard label="Desligamentos" value={desligados.length} icon={UserMinus} />
        <KpiCard label="Saldo" value={admitidos.length - desligados.length} icon={TrendingUp} />
        <KpiCard label="Rotatividade" value={rotatividade === "—" ? "—" : `${rotatividade}%`} icon={TrendingUp} />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="px-4 pt-4 text-sm font-semibold">Admissões no período</div>
          {admitidos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma admissão no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  {multiEmpresa && <TableHead>Empresa</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {admitidos.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-sm">{formatDateBR(a.data)}</TableCell>
                    <TableCell className="font-medium">{a.nome}</TableCell>
                    <TableCell className="text-sm">{a.cargo}</TableCell>
                    {multiEmpresa && <TableCell className="text-sm">{a.empresa}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div className="px-4 pt-4 text-sm font-semibold">Desligamentos no período</div>
          {desligados.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum desligamento no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Motivo</TableHead>
                  {multiEmpresa && <TableHead>Empresa</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {desligados.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-sm">{formatDateBR(d.data)}</TableCell>
                    <TableCell className="font-medium">{d.nome}</TableCell>
                    <TableCell className="text-sm">{d.cargo}</TableCell>
                    <TableCell className="text-sm">{d.motivo}</TableCell>
                    {multiEmpresa && <TableCell className="text-sm">{d.empresa}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
