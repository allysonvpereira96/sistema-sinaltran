"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarX, Clock, Stethoscope, Users, Printer, Download, Loader2 } from "lucide-react";
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
import { listOcorrenciasCaderno, type OcorrenciaCaderno } from "@/lib/actions/caderno-virtual";
import type { RelatorioChildProps } from "./relatorios-rh-view";
import { baixarCSV, inicioMesISO, hojeISO } from "./relatorios-utils";
import { KpiCard } from "./rel-kpi";

type Linha = {
  id: string;
  nome: string;
  cargo: string;
  empresa: string;
  faltas: number;
  atrasos: number;
  atestadosQtd: number;
  atestadosDias: number;
};

export function RelAbsenteismo({ colaboradores, empresaId, empresaById, multiEmpresa }: RelatorioChildProps) {
  const [inicio, setInicio] = useState(inicioMesISO());
  const [fim, setFim] = useState(hojeISO());
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaCaderno[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!inicio || !fim || inicio > fim) return;
    let cancelado = false;
    // setState só nos callbacks assíncronos (evita render em cascata).
    listOcorrenciasCaderno({ inicio, fim })
      .then((data) => {
        if (!cancelado) {
          setOcorrencias(data);
          setCarregando(false);
        }
      })
      .catch(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [inicio, fim]);

  const empresaDoColab = useMemo(
    () => new Map(colaboradores.map((c) => [c.id, c.empresa_id ?? null])),
    [colaboradores],
  );

  const linhas = useMemo<Linha[]>(() => {
    const map = new Map<string, Linha>();
    for (const o of ocorrencias) {
      const empColab = empresaDoColab.get(o.colaborador_id) ?? null;
      if (empresaId !== "todas" && empColab !== empresaId) continue;
      if (o.tipo !== "falta" && o.tipo !== "atraso" && o.tipo !== "atestado") continue;
      const linha = map.get(o.colaborador_id) ?? {
        id: o.colaborador_id,
        nome: o.colaborador_nome,
        cargo: o.colaborador_cargo ?? "—",
        empresa: empColab ? empresaById.get(empColab) ?? "—" : "—",
        faltas: 0,
        atrasos: 0,
        atestadosQtd: 0,
        atestadosDias: 0,
      };
      if (o.tipo === "falta") linha.faltas += 1;
      else if (o.tipo === "atraso") linha.atrasos += 1;
      else if (o.tipo === "atestado") {
        linha.atestadosQtd += 1;
        linha.atestadosDias += o.dias_atestado && o.dias_atestado > 0 ? o.dias_atestado : 1;
      }
      map.set(o.colaborador_id, linha);
    }
    return [...map.values()].sort(
      (a, b) =>
        b.faltas - a.faltas ||
        b.atestadosDias - a.atestadosDias ||
        b.atrasos - a.atrasos ||
        a.nome.localeCompare(b.nome),
    );
  }, [ocorrencias, empresaId, empresaById, empresaDoColab]);

  const kpis = useMemo(
    () => ({
      faltas: linhas.reduce((s, l) => s + l.faltas, 0),
      atrasos: linhas.reduce((s, l) => s + l.atrasos, 0),
      dias: linhas.reduce((s, l) => s + l.atestadosDias, 0),
      pessoas: linhas.length,
    }),
    [linhas],
  );

  function exportar() {
    const header = ["Nome", "Cargo", "Faltas", "Atrasos", "Atestados", "Dias de atestado"];
    if (multiEmpresa) header.push("Empresa");
    baixarCSV(
      `absenteismo-${inicio}-a-${fim}.csv`,
      header,
      linhas.map((l) => {
        const cols: (string | number)[] = [l.nome, l.cargo, l.faltas, l.atrasos, l.atestadosQtd, l.atestadosDias];
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
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Início</label>
            <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Fim</label>
            <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="w-40" />
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

      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Absenteísmo</h2>
          <p className="text-sm text-muted-foreground">
            Faltas, atrasos e atestados lançados no Caderno Virtual no período.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Faltas" value={kpis.faltas} icon={CalendarX} />
        <KpiCard label="Atrasos" value={kpis.atrasos} icon={Clock} />
        <KpiCard label="Dias de atestado" value={kpis.dias} icon={Stethoscope} />
        <KpiCard label="Colaboradores" value={kpis.pessoas} icon={Users} />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {carregando ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
              <p className="text-sm">Carregando ocorrências…</p>
            </div>
          ) : linhas.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <CalendarX className="size-8 opacity-40" />
              <p className="text-sm">Nenhuma falta, atraso ou atestado no período.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="text-center">Faltas</TableHead>
                  <TableHead className="text-center">Atrasos</TableHead>
                  <TableHead className="text-center">Atestados</TableHead>
                  <TableHead className="text-center">Dias atest.</TableHead>
                  {multiEmpresa && <TableHead>Empresa</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.nome}</TableCell>
                    <TableCell className="text-sm">{l.cargo}</TableCell>
                    <TableCell className="text-center tabular-nums">{l.faltas || "—"}</TableCell>
                    <TableCell className="text-center tabular-nums">{l.atrasos || "—"}</TableCell>
                    <TableCell className="text-center tabular-nums">{l.atestadosQtd || "—"}</TableCell>
                    <TableCell className="text-center tabular-nums">{l.atestadosDias || "—"}</TableCell>
                    {multiEmpresa && <TableCell className="text-sm">{l.empresa}</TableCell>}
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
