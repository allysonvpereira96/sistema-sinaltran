"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plane, AlertTriangle, Clock, Printer, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateBR } from "@/lib/format";
import { classificarDias, prazoLabel, VENC_LABEL, VENC_TONE } from "@/lib/vencimentos";
import type { FeriasRiscoRow } from "@/lib/types/rh";
import { cn } from "@/lib/utils";
import type { RelatorioChildProps } from "./relatorios-rh-view";
import { baixarCSV } from "./relatorios-utils";
import { KpiCard } from "./rel-kpi";

const JANELAS = [
  { value: "todos", label: "Todos" },
  { value: "90", label: "Até 90 dias / vencidos" },
  { value: "60", label: "Até 60 dias / vencidos" },
  { value: "30", label: "Até 30 dias / vencidos" },
] as const;

const periodo = (ini: string, fim: string) => `${formatDateBR(ini)} → ${formatDateBR(fim)}`;
const numDias = (n: number) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function RelFerias({
  colaboradores,
  empresaId,
  empresaById,
  multiEmpresa,
  feriasRisco,
}: RelatorioChildProps & { feriasRisco: FeriasRiscoRow[] }) {
  const [janela, setJanela] = useState<string>("todos");

  const empresaDoColab = useMemo(
    () => new Map(colaboradores.map((c) => [c.id, c.empresa_id ?? null])),
    [colaboradores],
  );

  const linhas = useMemo(() => {
    const limite = janela === "todos" ? null : Number(janela);
    return feriasRisco
      .filter((f) => {
        const emp = empresaDoColab.get(f.colaborador_id) ?? null;
        if (empresaId !== "todas" && emp !== empresaId) return false;
        if (limite != null) {
          if (f.dias_para_dobra == null) return false;
          if (f.dias_para_dobra > limite) return false;
        }
        return true;
      })
      .map((f) => ({
        ...f,
        empresa: empresaDoColab.get(f.colaborador_id) ? empresaById.get(empresaDoColab.get(f.colaborador_id)!) ?? "—" : "—",
      }))
      .sort((a, b) => (a.dias_para_dobra ?? 1e9) - (b.dias_para_dobra ?? 1e9));
  }, [feriasRisco, janela, empresaId, empresaDoColab, empresaById]);

  const kpis = useMemo(() => {
    let emDobra = 0, urgentes = 0;
    for (const l of linhas) {
      const s = classificarDias(l.dias_para_dobra);
      if (s === "vencido") emDobra++;
      else if (s === "urgente") urgentes++;
    }
    return { emDobra, urgentes, total: linhas.length };
  }, [linhas]);

  function exportar() {
    const header = ["Colaborador", "Cargo", "Aquisitivo", "Dias direito", "Prazo p/ iniciar gozo", "Situação"];
    if (multiEmpresa) header.push("Empresa");
    baixarCSV(
      "ferias-a-vencer.csv",
      header,
      linhas.map((l) => {
        const cols: (string | number | null)[] = [
          l.colaborador,
          l.cargo ?? "",
          periodo(l.aquisitivo_inicio, l.aquisitivo_fim),
          numDias(l.dias_direito),
          l.prazo_inicio_gozo ? formatDateBR(l.prazo_inicio_gozo) + (l.prazo_oficial ? "" : " (calc.)") : "—",
          VENC_LABEL[classificarDias(l.dias_para_dobra)],
        ];
        if (multiEmpresa) cols.push(l.empresa);
        return cols;
      }),
    );
  }

  return (
    <div className="space-y-6">
      <Card className="print:hidden">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Janela (prazo p/ dobra)</label>
            <select value={janela} onChange={(e) => setJanela(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm w-56 block">
              {JANELAS.map((j) => (<option key={j.value} value={j.value}>{j.label}</option>))}
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={exportar} disabled={linhas.length === 0}>
              <Download className="size-4" /> Exportar CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => window.print()} disabled={linhas.length === 0}>
              <Printer className="size-4" /> Imprimir / PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Já em dobra" value={kpis.emDobra} icon={AlertTriangle} />
        <KpiCard label="Vencem em 30 dias" value={kpis.urgentes} icon={Clock} />
        <KpiCard label="Períodos em risco" value={kpis.total} icon={Plane} />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {linhas.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Plane className="size-8 opacity-40" />
              <p className="text-sm">Nenhum período aquisitivo em risco nessa janela.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Aquisitivo</TableHead>
                  <TableHead className="text-center">Dias</TableHead>
                  <TableHead>Iniciar gozo até</TableHead>
                  <TableHead>Situação</TableHead>
                  {multiEmpresa && <TableHead>Empresa</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => {
                  const status = classificarDias(l.dias_para_dobra);
                  const tone = VENC_TONE[status];
                  return (
                    <TableRow key={l.registro_id}>
                      <TableCell>
                        <Link href={`/pessoal/colaboradores/${l.colaborador_id}`} className="font-medium hover:underline">{l.colaborador}</Link>
                        <div className="text-xs text-muted-foreground">{l.setor ?? "—"}</div>
                      </TableCell>
                      <TableCell className="text-sm">{l.cargo ?? "—"}</TableCell>
                      <TableCell className="text-sm">{periodo(l.aquisitivo_inicio, l.aquisitivo_fim)}</TableCell>
                      <TableCell className="text-center text-sm tabular-nums">{numDias(l.dias_direito)}</TableCell>
                      <TableCell className="text-sm">
                        <div>
                          {l.prazo_inicio_gozo ? formatDateBR(l.prazo_inicio_gozo) : "—"}
                          {l.prazo_inicio_gozo && !l.prazo_oficial ? <span className="text-[11px] text-muted-foreground"> (calc.)</span> : null}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{prazoLabel(l.dias_para_dobra)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("font-medium text-xs gap-1.5", tone.bg, tone.text)}>
                          <span className={cn("size-1.5 rounded-full", tone.dot)} />
                          {VENC_LABEL[status]}
                        </Badge>
                      </TableCell>
                      {multiEmpresa && <TableCell className="text-sm">{l.empresa}</TableCell>}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
