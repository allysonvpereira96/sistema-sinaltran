"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, FileSpreadsheet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Colaborador } from "@/lib/mocks/colaboradores";
import type { CentroCustoResumo } from "@/lib/actions/colaboradores";
import { custoMensalColaborador, valorInsalubridade } from "@/lib/rh";
import { formatBRL, formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";

type Ordem = "nome" | "custo";

export function CustoMensalRelatorio({
  colaboradores,
  centrosCusto,
  salarioMinimo,
}: {
  colaboradores: Colaborador[];
  centrosCusto: CentroCustoResumo[];
  salarioMinimo: number;
}) {
  const [ordem, setOrdem] = useState<Ordem>("custo");
  const [hoje] = useState(() => new Date());

  const centroById = useMemo(
    () => new Map(centrosCusto.map((cc) => [cc.id, cc.nome])),
    [centrosCusto],
  );

  const linhas = useMemo(() => {
    const rows = colaboradores.map((c) => ({
      c,
      centro: c.centro_custo_id ? centroById.get(c.centro_custo_id) ?? "—" : "—",
      base: c.remuneracao_base ?? 0,
      mobilidade: c.ajuda_custo ?? 0,
      gratificacoes: c.gratificacoes ?? 0,
      insalubridade: valorInsalubridade(c.insalubridade_pct, salarioMinimo),
      total: custoMensalColaborador(c, salarioMinimo),
    }));
    rows.sort((a, b) =>
      ordem === "nome"
        ? a.c.nome_completo.localeCompare(b.c.nome_completo)
        : b.total - a.total,
    );
    return rows;
  }, [colaboradores, centroById, salarioMinimo, ordem]);

  const totais = useMemo(
    () =>
      linhas.reduce(
        (acc, l) => ({
          base: acc.base + l.base,
          mobilidade: acc.mobilidade + l.mobilidade,
          gratificacoes: acc.gratificacoes + l.gratificacoes,
          insalubridade: acc.insalubridade + l.insalubridade,
          total: acc.total + l.total,
        }),
        { base: 0, mobilidade: 0, gratificacoes: 0, insalubridade: 0, total: 0 },
      ),
    [linhas],
  );

  function exportarExcel() {
    const sep = ";";
    const num = (n: number) => n.toFixed(2).replace(".", ",");
    const esc = (s: string) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const head = [
      "Colaborador", "Matrícula", "Centro de custo",
      "Remuneração", "Aux. mobilidade", "Gratificações", "Insalubridade", "Total",
    ];
    const corpo = linhas.map((l) =>
      [
        esc(l.c.nome_completo), esc(l.c.matricula ?? ""), esc(l.centro),
        num(l.base), num(l.mobilidade), num(l.gratificacoes), num(l.insalubridade), num(l.total),
      ].join(sep),
    );
    const rodape = [
      esc(`TOTAL (${linhas.length})`), "", "",
      num(totais.base), num(totais.mobilidade), num(totais.gratificacoes), num(totais.insalubridade), num(totais.total),
    ].join(sep);
    const csv = "﻿" + [head.join(sep), ...corpo, rodape].join("\r\n");
    const ymd = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `custo-mensal-${ymd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center gap-3 print:hidden">
        <Link
          href="/pessoal/colaboradores"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Custo mensal — ativos</h1>
          <p className="text-sm text-muted-foreground">Remuneração + auxílio mobilidade + gratificações + insalubridade, por colaborador.</p>
        </div>
        <div className="flex items-center gap-1 rounded-md border p-0.5">
          <button
            type="button"
            onClick={() => setOrdem("custo")}
            className={cn("px-3 py-1.5 text-xs font-semibold rounded", ordem === "custo" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            Maior custo
          </button>
          <button
            type="button"
            onClick={() => setOrdem("nome")}
            className={cn("px-3 py-1.5 text-xs font-semibold rounded", ordem === "nome" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            Nome
          </button>
        </div>
        <Button variant="outline" className="gap-2" onClick={exportarExcel}>
          <FileSpreadsheet className="size-4" />
          Exportar Excel
        </Button>
        <Button className="gap-2" onClick={() => window.print()}>
          <Printer className="size-4" />
          Imprimir / PDF
        </Button>
      </div>

      {/* Cabeçalho do relatório (aparece também na impressão) */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Sinaltran — Custo mensal (colaboradores ativos)</h1>
        <p className="text-sm">
          Gerado em {formatDateBR(hoje)} · {linhas.length} colaboradores · Base de insalubridade: salário mínimo {formatBRL(salarioMinimo)}
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{linhas.length}</span> colaboradores ativos ·
            insalubridade sobre salário mínimo de <span className="font-medium">{formatBRL(salarioMinimo)}</span>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Custo mensal total</div>
            <div className="text-2xl font-bold tabular-nums">{formatBRL(totais.total)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Centro de custo</TableHead>
                <TableHead className="text-right">Remuneração</TableHead>
                <TableHead className="text-right">Aux. mobilidade</TableHead>
                <TableHead className="text-right">Gratificações</TableHead>
                <TableHead className="text-right">Insalubridade</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => (
                <TableRow key={l.c.id}>
                  <TableCell>
                    <div className="font-medium">{l.c.nome_completo}</div>
                    <div className="text-xs text-muted-foreground font-mono">mat. {l.c.matricula ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-sm">{l.centro}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{formatBRL(l.base)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{formatBRL(l.mobilidade)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{formatBRL(l.gratificacoes)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{formatBRL(l.insalubridade)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-semibold">{formatBRL(l.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot className="border-t bg-muted/40 font-semibold">
              <tr>
                <td className="p-3" colSpan={2}>TOTAL ({linhas.length})</td>
                <td className="p-3 text-right tabular-nums">{formatBRL(totais.base)}</td>
                <td className="p-3 text-right tabular-nums">{formatBRL(totais.mobilidade)}</td>
                <td className="p-3 text-right tabular-nums">{formatBRL(totais.gratificacoes)}</td>
                <td className="p-3 text-right tabular-nums">{formatBRL(totais.insalubridade)}</td>
                <td className="p-3 text-right tabular-nums">{formatBRL(totais.total)}</td>
              </tr>
            </tfoot>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
