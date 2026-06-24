"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, AlertTriangle, Clock, Printer, Download } from "lucide-react";
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
import {
  classificarDias,
  diasAteVencimento,
  prazoLabel,
  VENC_LABEL,
  VENC_TONE,
} from "@/lib/vencimentos";
import type { VencimentoRow } from "@/lib/types/rh";
import { cn } from "@/lib/utils";
import type { RelatorioChildProps } from "./relatorios-rh-view";
import { baixarCSV } from "./relatorios-utils";
import { KpiCard } from "./rel-kpi";

const JANELAS = [
  { value: "30", label: "Vencidos e até 30 dias" },
  { value: "60", label: "Vencidos e até 60 dias" },
  { value: "90", label: "Vencidos e até 90 dias" },
  { value: "todos", label: "Todos" },
] as const;

export function RelVencimentos({
  colaboradores,
  empresaId,
  empresaById,
  multiEmpresa,
  vencimentos,
}: RelatorioChildProps & { vencimentos: VencimentoRow[] }) {
  const [janela, setJanela] = useState<string>("60");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");

  const empresaDoColab = useMemo(
    () => new Map(colaboradores.map((c) => [c.id, c.empresa_id ?? null])),
    [colaboradores],
  );

  // Linhas de CNH derivadas do cadastro (não vêm da view de vencimentos)
  const cnhRows = useMemo<VencimentoRow[]>(
    () =>
      colaboradores
        .filter((c) => c.status !== "desligado" && c.cnh_validade)
        .map((c) => ({
          tipo: "CNH",
          registro_id: `cnh-${c.id}`,
          colaborador_id: c.id,
          colaborador: c.nome_completo,
          setor: c.setor ?? null,
          descricao: c.cnh ? `CNH ${c.cnh}` : "CNH",
          vencimento: c.cnh_validade ?? null,
          dias_para_vencer: diasAteVencimento(c.cnh_validade),
        })),
    [colaboradores],
  );

  const todas = useMemo(
    () => [...vencimentos.filter((v) => v.tipo !== "Férias"), ...cnhRows],
    [vencimentos, cnhRows],
  );

  const tipos = useMemo(
    () => ["todos", ...Array.from(new Set(todas.map((v) => v.tipo))).sort()],
    [todas],
  );

  const linhas = useMemo(() => {
    const limite = janela === "todos" ? null : Number(janela);
    return todas
      .filter((v) => {
        const emp = empresaDoColab.get(v.colaborador_id) ?? null;
        if (empresaId !== "todas" && emp !== empresaId) return false;
        if (tipoFiltro !== "todos" && v.tipo !== tipoFiltro) return false;
        if (limite != null) {
          if (v.dias_para_vencer == null) return false;
          if (v.dias_para_vencer > limite) return false;
        }
        return true;
      })
      .map((v) => ({ ...v, empresa: empresaDoColab.get(v.colaborador_id) ? empresaById.get(empresaDoColab.get(v.colaborador_id)!) ?? "—" : "—" }))
      .sort((a, b) => (a.dias_para_vencer ?? 1e9) - (b.dias_para_vencer ?? 1e9));
  }, [todas, janela, tipoFiltro, empresaId, empresaDoColab, empresaById]);

  const kpis = useMemo(() => {
    let vencidos = 0, urgentes = 0, atencao = 0;
    for (const l of linhas) {
      const s = classificarDias(l.dias_para_vencer);
      if (s === "vencido") vencidos++;
      else if (s === "urgente") urgentes++;
      else if (s === "atencao") atencao++;
    }
    return { vencidos, urgentes, atencao };
  }, [linhas]);

  function exportar() {
    const header = ["Colaborador", "Tipo", "Descrição", "Vencimento", "Situação"];
    if (multiEmpresa) header.push("Empresa");
    baixarCSV(
      `vencimentos-${janela}.csv`,
      header,
      linhas.map((l) => {
        const cols: (string | number | null)[] = [
          l.colaborador, l.tipo, l.descricao, l.vencimento ? formatDateBR(l.vencimento) : "—", VENC_LABEL[classificarDias(l.dias_para_vencer)],
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
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Janela</label>
            <select value={janela} onChange={(e) => setJanela(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm w-56 block">
              {JANELAS.map((j) => (<option key={j.value} value={j.value}>{j.label}</option>))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Tipo</label>
            <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm w-44 block">
              {tipos.map((t) => (<option key={t} value={t}>{t === "todos" ? "Todos" : t}</option>))}
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
        <KpiCard label="Vencidos" value={kpis.vencidos} icon={AlertTriangle} />
        <KpiCard label="Vencem em 30 dias" value={kpis.urgentes} icon={Clock} />
        <KpiCard label="Entre 31 e 60 dias" value={kpis.atencao} icon={CalendarClock} />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {linhas.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <CalendarClock className="size-8 opacity-40" />
              <p className="text-sm">Nada a vencer nessa janela. 🎉</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Situação</TableHead>
                  {multiEmpresa && <TableHead>Empresa</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => {
                  const status = classificarDias(l.dias_para_vencer);
                  const tone = VENC_TONE[status];
                  return (
                    <TableRow key={`${l.tipo}-${l.registro_id}`}>
                      <TableCell>
                        <Link href={`/pessoal/colaboradores/${l.colaborador_id}`} className="font-medium hover:underline">{l.colaborador}</Link>
                        <div className="text-xs text-muted-foreground">{l.setor ?? "—"}</div>
                      </TableCell>
                      <TableCell className="text-sm">{l.tipo}</TableCell>
                      <TableCell className="text-sm">{l.descricao}</TableCell>
                      <TableCell className="text-sm">
                        <div>{l.vencimento ? formatDateBR(l.vencimento) : "—"}</div>
                        <div className="text-[11px] text-muted-foreground">{prazoLabel(l.dias_para_vencer)}</div>
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
