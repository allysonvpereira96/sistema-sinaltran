"use client";

import { useMemo } from "react";
import Link from "next/link";
import { HeartPulse, Users, Printer, Download } from "lucide-react";
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
import { formatTelefone } from "@/lib/format";
import type { EmergenciaGeralRow } from "@/lib/actions/colaboradores";
import type { RelatorioChildProps } from "./relatorios-rh-view";
import { escopoEmpresa, baixarCSV } from "./relatorios-utils";
import { KpiCard } from "./rel-kpi";

export function RelEmergencias({
  colaboradores,
  empresaId,
  empresaById,
  multiEmpresa,
  emergencias,
}: RelatorioChildProps & { emergencias: EmergenciaGeralRow[] }) {
  const linhas = useMemo(
    () =>
      emergencias
        .filter((e) => empresaId === "todas" || e.empresa_id === empresaId)
        .map((e) => ({
          ...e,
          empresa: e.empresa_id ? empresaById.get(e.empresa_id) ?? "—" : "—",
        }))
        .sort((a, b) => a.colaborador_nome.localeCompare(b.colaborador_nome) || a.nome.localeCompare(b.nome)),
    [emergencias, empresaId, empresaById],
  );

  const comContato = useMemo(() => new Set(linhas.map((l) => l.colaborador_id)).size, [linhas]);

  // Colaboradores ativos (no escopo) que NÃO têm nenhum contato cadastrado
  const semContato = useMemo(() => {
    const ativos = escopoEmpresa(colaboradores, empresaId).filter((c) => c.status !== "desligado");
    const comSet = new Set(linhas.map((l) => l.colaborador_id));
    return ativos.filter((c) => !comSet.has(c.id)).length;
  }, [colaboradores, empresaId, linhas]);

  function exportar() {
    const header = ["Colaborador", "Cargo", "Contato", "Parentesco", "Telefone"];
    if (multiEmpresa) header.push("Empresa");
    baixarCSV(
      "contatos-emergencia.csv",
      header,
      linhas.map((l) => {
        const cols: (string | null)[] = [l.colaborador_nome, l.colaborador_cargo, l.nome, l.parentesco, formatTelefone(l.telefone)];
        if (multiEmpresa) cols.push(l.empresa);
        return cols;
      }),
    );
  }

  return (
    <div className="space-y-6">
      <Card className="print:hidden">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Lista para emergências em campo — um colaborador pode ter mais de um contato.
          </p>
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
        <KpiCard label="Contatos cadastrados" value={linhas.length} icon={HeartPulse} />
        <KpiCard label="Colaboradores com contato" value={comContato} icon={Users} />
        <KpiCard label="Sem contato cadastrado" value={semContato} icon={Users} />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {linhas.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <HeartPulse className="size-8 opacity-40" />
              <p className="text-sm">Nenhum contato de emergência cadastrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Parentesco</TableHead>
                  <TableHead>Telefone</TableHead>
                  {multiEmpresa && <TableHead>Empresa</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Link href={`/pessoal/colaboradores/${l.colaborador_id}`} className="font-medium hover:underline">{l.colaborador_nome}</Link>
                      <div className="text-xs text-muted-foreground">{l.colaborador_setor ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-sm">{l.colaborador_cargo ?? "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{l.nome}</TableCell>
                    <TableCell className="text-sm">{l.parentesco ?? "—"}</TableCell>
                    <TableCell className="text-sm tabular-nums">{formatTelefone(l.telefone)}</TableCell>
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
