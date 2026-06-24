"use client";

import { useMemo, useState } from "react";
import { Cake, Printer, Download } from "lucide-react";
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
import { formatTelefone } from "@/lib/format";
import type { RelatorioChildProps } from "./relatorios-rh-view";
import { MESES, escopoEmpresa, baixarCSV } from "./relatorios-utils";

export function RelAniversariantes({ colaboradores, empresaId, empresaById, multiEmpresa }: RelatorioChildProps) {
  const anoAtual = new Date().getFullYear();
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [incluirDesligados, setIncluirDesligados] = useState(false);

  const escopo = useMemo(() => {
    return escopoEmpresa(colaboradores, empresaId).filter(
      (c) => incluirDesligados || c.status !== "desligado",
    );
  }, [colaboradores, empresaId, incluirDesligados]);

  const lista = useMemo(() => {
    return escopo
      .filter((c) => Number((c.data_nascimento ?? "").slice(5, 7)) === mes)
      .map((c) => {
        const nasc = c.data_nascimento ?? "";
        return {
          id: c.id,
          dia: Number(nasc.slice(8, 10)),
          nome: c.nome_completo,
          cargo: c.cargo,
          setor: c.setor ?? null,
          telefone: c.telefone,
          empresa: c.empresa_id ? empresaById.get(c.empresa_id) ?? "—" : "—",
          faz: nasc.slice(0, 4) ? anoAtual - Number(nasc.slice(0, 4)) : null,
        };
      })
      .sort((a, b) => a.dia - b.dia || a.nome.localeCompare(b.nome));
  }, [escopo, mes, empresaById, anoAtual]);

  const semData = useMemo(() => escopo.filter((c) => !c.data_nascimento).length, [escopo]);

  function exportar() {
    const header = ["Dia", "Nome", "Cargo", "Setor", "Telefone", "Faz"];
    if (multiEmpresa) header.push("Empresa");
    baixarCSV(
      `aniversariantes-${String(mes).padStart(2, "0")}-${MESES[mes - 1].toLowerCase()}.csv`,
      header,
      lista.map((a) => {
        const cols: (string | number | null)[] = [
          String(a.dia).padStart(2, "0"), a.nome, a.cargo, a.setor, formatTelefone(a.telefone), a.faz,
        ];
        if (multiEmpresa) cols.push(a.empresa);
        return cols;
      }),
    );
  }

  return (
    <div className="space-y-6">
      <Card className="print:hidden">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Mês</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm w-40 block"
            >
              {MESES.map((nome, i) => (
                <option key={nome} value={i + 1}>{nome}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm h-9">
            <input type="checkbox" className="size-4 rounded border-input" checked={incluirDesligados} onChange={(e) => setIncluirDesligados(e.target.checked)} />
            Incluir desligados
          </label>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={exportar} disabled={lista.length === 0}>
              <Download className="size-4" /> Exportar CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => window.print()} disabled={lista.length === 0}>
              <Printer className="size-4" /> Imprimir / PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <div className="size-11 rounded-xl bg-primary/10 grid place-items-center shrink-0 print:hidden">
          <Cake className="size-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Aniversariantes de {MESES[mes - 1]}</h2>
          <p className="text-sm text-muted-foreground">
            {lista.length} colaborador(es)
            {semData > 0 ? ` · ${semData} sem data de nascimento cadastrada` : ""}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {lista.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Cake className="size-8 opacity-40" />
              <p className="text-sm">Nenhum aniversariante em {MESES[mes - 1]}.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Dia</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-center">Faz</TableHead>
                  {multiEmpresa && <TableHead>Empresa</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono bg-primary/10 text-primary">
                        {String(a.dia).padStart(2, "0")}/{String(mes).padStart(2, "0")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{a.nome}</TableCell>
                    <TableCell className="text-sm">{a.cargo}</TableCell>
                    <TableCell className="text-sm">{a.setor ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatTelefone(a.telefone)}</TableCell>
                    <TableCell className="text-center text-sm tabular-nums">{a.faz ?? "—"}</TableCell>
                    {multiEmpresa && <TableCell className="text-sm">{a.empresa}</TableCell>}
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
