"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Search, Check, X } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { RelacaoLinha, RelacaoMensal } from "@/lib/actions/beneficios";
import { formatBRL, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";

export function RelacaoView({
  competencia,
  linhas,
  totais,
}: {
  competencia: string;
  linhas: RelacaoLinha[];
  totais: RelacaoMensal["totais"];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [y, m] = competencia.split("-");

  const filtradas = useMemo(() => {
    const q = normalizeSearch(busca);
    return linhas.filter((l) => !q || normalizeSearch(`${l.nome} ${l.matricula ?? ""}`).includes(q));
  }, [linhas, busca]);

  function trocarMes(ym: string) {
    router.push(`/pessoal/beneficios/relacao?competencia=${ym}`);
  }

  function exportarExcel() {
    const sep = ";";
    const num = (n: number) => n.toFixed(2).replace(".", ",");
    const esc = (s: string) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const head = ["Colaborador", "Matrícula", "Vale-refeição", "Combustível", "Cesta básica", "Total (R$)"];
    const corpo = linhas.map((l) =>
      [
        esc(l.nome), esc(l.matricula ?? ""), num(l.vr), num(l.combustivel),
        esc(l.cesta == null ? "—" : l.cesta ? "Sim" : "Não"), num(l.total_dinheiro),
      ].join(sep),
    );
    const rodape = [esc(`TOTAL (${linhas.length})`), "", num(totais.vr), num(totais.combustivel), esc(`${totais.cestas} cestas`), num(totais.total_dinheiro)].join(sep);
    const csv = "﻿" + [head.join(sep), ...corpo, rodape].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relacao-beneficios-${competencia}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1300px] mx-auto space-y-6">
      <PageHeader
        title="Relação mensal de benefícios"
        description="Quanto foi pago a cada colaborador no mês (vale-refeição + combustível) e quem recebeu cesta."
        actions={<Button variant="outline" onClick={exportarExcel} className="gap-2"><FileSpreadsheet className="size-4" />Exportar Excel</Button>}
      />

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Competência</Label>
            <Input type="month" value={competencia} onChange={(e) => e.target.value && trocarMes(e.target.value)} className="h-9 w-40" />
          </div>
          <div className="flex items-center gap-2 h-9 w-full lg:w-64 rounded-md border bg-background px-3 text-sm">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar colaborador…" className="flex-1 bg-transparent outline-none" />
          </div>
          <div className="ml-auto flex items-end gap-5 text-right">
            <Resumo label="Vale-refeição" valor={formatBRL(totais.vr)} />
            <Resumo label="Combustível" valor={formatBRL(totais.combustivel)} />
            <Resumo label="Cestas" valor={String(totais.cestas)} />
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total em dinheiro</div>
              <div className="text-xl font-bold tabular-nums">{formatBRL(totais.total_dinheiro)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead className="text-right">Vale-refeição</TableHead>
                <TableHead className="text-right">Combustível</TableHead>
                <TableHead className="text-center">Cesta básica</TableHead>
                <TableHead className="text-right">Total (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-16 text-center text-sm text-muted-foreground">Nenhum colaborador ativo na empresa selecionada.</TableCell></TableRow>
              ) : (
                filtradas.map((l) => (
                  <TableRow key={l.colaborador_id}>
                    <TableCell>
                      <div className="font-medium">{l.nome}</div>
                      <div className="text-xs text-muted-foreground font-mono">mat. {l.matricula ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{l.vr > 0 ? formatBRL(l.vr) : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.combustivel > 0 ? formatBRL(l.combustivel) : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-center">
                      {l.cesta == null ? (
                        <span className="text-muted-foreground text-sm">—</span>
                      ) : l.cesta ? (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 gap-1"><Check className="size-3" />Sim</Badge>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground" title={l.cesta_obs ?? undefined}><X className="size-3" />Não</span>
                      )}
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums font-semibold", l.total_dinheiro === 0 && "text-muted-foreground font-normal")}>{formatBRL(l.total_dinheiro)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">TOTAL ({linhas.length})</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{formatBRL(totais.vr)}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{formatBRL(totais.combustivel)}</TableCell>
                <TableCell className="text-center font-semibold">{totais.cestas} cestas</TableCell>
                <TableCell className="text-right tabular-nums font-bold">{formatBRL(totais.total_dinheiro)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Competência {m}/{y}. “Total em dinheiro” soma vale-refeição e combustível; a cesta básica é em espécie (não entra no valor). Os recibos individuais saem nas telas de cada benefício.
      </p>
    </div>
  );
}

function Resumo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{valor}</div>
    </div>
  );
}
