"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { EpiEntrega } from "@/lib/actions/epi";
import { formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";

type ColabResumo = { id: string; nome: string; cargo: string; matricula: string | null };

function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function baixarCsv(nome: string, head: string[], linhas: (string | number)[][]) {
  const sep = ";";
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + [head.map(esc).join(sep), ...linhas.map((l) => l.map(esc).join(sep))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nome}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function RelatoriosView({
  entregas,
  colaboradores,
}: {
  entregas: EpiEntrega[];
  colaboradores: ColabResumo[];
}) {
  const hoje = hojeIso();
  const [tab, setTab] = useState("trocas");

  const trocas = useMemo(
    () =>
      entregas
        .filter((e) => !e.data_devolucao && e.data_prevista_troca)
        .sort((a, b) => (a.data_prevista_troca! < b.data_prevista_troca! ? -1 : 1)),
    [entregas],
  );

  const consumo = useMemo(() => {
    const acc = new Map<string, { item: string; codigo: string; qtd: number; entregas: number }>();
    for (const e of entregas) {
      const k = e.item_codigo || e.item_nome;
      const cur = acc.get(k) ?? { item: e.item_nome, codigo: e.item_codigo, qtd: 0, entregas: 0 };
      cur.qtd += e.quantidade;
      cur.entregas += 1;
      acc.set(k, cur);
    }
    return [...acc.values()].sort((a, b) => b.qtd - a.qtd);
  }, [entregas]);

  const semEntrega = useMemo(() => {
    const comEntrega = new Set(entregas.map((e) => e.colaborador_id));
    return colaboradores.filter((c) => !comEntrega.has(c.id));
  }, [entregas, colaboradores]);

  return (
    <div className="p-6 lg:p-8 max-w-[1300px] mx-auto space-y-6">
      <PageHeader title="Relatórios de EPI" description="Trocas pendentes, consumo por item e colaboradores sem entrega." />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="trocas">Trocas pendentes ({trocas.length})</TabsTrigger>
          <TabsTrigger value="consumo">Consumo por item ({consumo.length})</TabsTrigger>
          <TabsTrigger value="sem">Sem entrega ({semEntrega.length})</TabsTrigger>
        </TabsList>

        {/* Trocas */}
        <TabsContent value="trocas" className="pt-4 space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => baixarCsv(
              "epi-trocas-pendentes",
              ["Colaborador", "Item", "Entrega", "Troca prevista", "Situação"],
              trocas.map((t) => [t.colaborador_nome, t.item_nome, formatDateBR(t.data_entrega), formatDateBR(t.data_prevista_troca), t.data_prevista_troca! < hoje ? "Vencida" : "Em dia"]),
            )}>
              <FileSpreadsheet className="size-4" />Exportar Excel
            </Button>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Colaborador</TableHead><TableHead>Item</TableHead>
                <TableHead>Entrega</TableHead><TableHead>Troca prevista</TableHead><TableHead>Situação</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {trocas.length === 0 ? <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">Sem trocas pendentes.</TableCell></TableRow>
                : trocas.map((t) => {
                  const venc = t.data_prevista_troca! < hoje;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm font-medium">{t.colaborador_nome}</TableCell>
                      <TableCell className="text-sm">{t.item_nome}</TableCell>
                      <TableCell className="text-xs">{formatDateBR(t.data_entrega)}</TableCell>
                      <TableCell className={cn("text-xs", venc && "text-rose-600 font-semibold")}>{formatDateBR(t.data_prevista_troca)}</TableCell>
                      <TableCell>{venc ? <Badge variant="secondary" className="gap-1 bg-rose-50 text-rose-700"><AlertTriangle className="size-3" />Vencida</Badge> : <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">Em dia</Badge>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Consumo */}
        <TabsContent value="consumo" className="pt-4 space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => baixarCsv(
              "epi-consumo-por-item",
              ["Código", "Item", "Qtd entregue", "Nº entregas"],
              consumo.map((c) => [c.codigo, c.item, c.qtd, c.entregas]),
            )}>
              <FileSpreadsheet className="size-4" />Exportar Excel
            </Button>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Item</TableHead><TableHead className="text-right">Qtd entregue</TableHead><TableHead className="text-right">Nº entregas</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {consumo.length === 0 ? <TableRow><TableCell colSpan={3} className="py-12 text-center text-sm text-muted-foreground">Sem entregas.</TableCell></TableRow>
                : consumo.map((c) => (
                  <TableRow key={c.codigo + c.item}>
                    <TableCell><div className="text-sm font-medium">{c.item}</div><div className="text-xs text-muted-foreground font-mono">{c.codigo}</div></TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{c.qtd}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{c.entregas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Sem entrega */}
        <TabsContent value="sem" className="pt-4 space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => baixarCsv(
              "epi-colaboradores-sem-entrega",
              ["Matrícula", "Colaborador", "Cargo"],
              semEntrega.map((c) => [c.matricula ?? "", c.nome, c.cargo]),
            )}>
              <FileSpreadsheet className="size-4" />Exportar Excel
            </Button>
          </div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>Cargo</TableHead></TableRow></TableHeader>
              <TableBody>
                {semEntrega.length === 0 ? <TableRow><TableCell colSpan={2} className="py-12 text-center text-sm text-muted-foreground">Todos os ativos têm entrega.</TableCell></TableRow>
                : semEntrega.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><div className="text-sm font-medium">{c.nome}</div><div className="text-xs text-muted-foreground font-mono">mat. {c.matricula ?? "—"}</div></TableCell>
                    <TableCell className="text-sm">{c.cargo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
