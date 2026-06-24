"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, AlertTriangle, Coins, Repeat, Boxes } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { EpiEntrega } from "@/lib/actions/epi";
import { formatBRL, formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";

type ColabResumo = { id: string; nome: string; cargo: string; matricula: string | null };

function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function inicioAnoIso() {
  return `${new Date().getFullYear()}-01-01`;
}

const ehPerda = (motivo: string) => /perda|extravio/i.test(motivo);

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

  // Trocas no período (com custo + filtro por motivo)
  const [ini, setIni] = useState(inicioAnoIso());
  const [fim, setFim] = useState(hoje);
  const [motivo, setMotivo] = useState("todos");

  const motivos = useMemo(
    () => ["todos", ...Array.from(new Set(entregas.map((e) => e.motivo_entrega).filter(Boolean))).sort()],
    [entregas],
  );

  const trocasPeriodo = useMemo(
    () =>
      entregas
        .filter((e) => e.data_entrega >= ini && e.data_entrega <= fim && (motivo === "todos" || e.motivo_entrega === motivo))
        .map((e) => ({ ...e, custo: e.quantidade * e.preco_unitario }))
        .sort((a, b) => (a.data_entrega < b.data_entrega ? 1 : -1)),
    [entregas, ini, fim, motivo],
  );

  const totQtd = useMemo(() => trocasPeriodo.reduce((s, t) => s + t.quantidade, 0), [trocasPeriodo]);
  const totCusto = useMemo(() => trocasPeriodo.reduce((s, t) => s + t.custo, 0), [trocasPeriodo]);
  const custoPerdas = useMemo(
    () => trocasPeriodo.filter((t) => ehPerda(t.motivo_entrega)).reduce((s, t) => s + t.custo, 0),
    [trocasPeriodo],
  );

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
          <TabsTrigger value="periodo">Trocas no período ({trocasPeriodo.length})</TabsTrigger>
          <TabsTrigger value="consumo">Consumo por item ({consumo.length})</TabsTrigger>
          <TabsTrigger value="sem">Sem entrega ({semEntrega.length})</TabsTrigger>
        </TabsList>

        {/* Trocas no período (custo + filtro por motivo) */}
        <TabsContent value="periodo" className="pt-4 space-y-3">
          <Card><CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Início</label>
              <Input type="date" value={ini} onChange={(e) => setIni(e.target.value)} className="h-9 w-40" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Fim</label>
              <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="h-9 w-40" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Motivo</label>
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className="h-9 w-52 rounded-md border border-input bg-background px-3 text-sm">
                {motivos.map((m) => <option key={m} value={m}>{m === "todos" ? "Todos os motivos" : m}</option>)}
              </select>
            </div>
            <Button variant="outline" size="sm" className="gap-2 ml-auto" disabled={trocasPeriodo.length === 0} onClick={() => baixarCsv(
              "epi-trocas-periodo",
              ["Data", "Colaborador", "Item", "Código", "Motivo", "Qtd", "Custo unit.", "Custo total"],
              trocasPeriodo.map((t) => [formatDateBR(t.data_entrega), t.colaborador_nome, t.item_nome, t.item_codigo, t.motivo_entrega, t.quantidade, t.preco_unitario.toFixed(2).replace(".", ","), t.custo.toFixed(2).replace(".", ",")]),
            )}>
              <FileSpreadsheet className="size-4" />Exportar Excel
            </Button>
          </CardContent></Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 grid place-items-center"><Repeat className="size-5 text-primary" /></div>
              <div><div className="text-2xl font-bold tabular-nums">{trocasPeriodo.length}</div><div className="text-xs text-muted-foreground">Entregas/trocas</div></div>
            </CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 grid place-items-center"><Boxes className="size-5 text-primary" /></div>
              <div><div className="text-2xl font-bold tabular-nums">{totQtd}</div><div className="text-xs text-muted-foreground">Itens entregues</div></div>
            </CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 grid place-items-center"><Coins className="size-5 text-primary" /></div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{formatBRL(totCusto)}</div>
                <div className="text-xs text-muted-foreground">Custo total{custoPerdas > 0 ? ` · ${formatBRL(custoPerdas)} em perdas` : ""}</div>
              </div>
            </CardContent></Card>
          </div>

          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Colaborador</TableHead><TableHead>Item</TableHead>
                <TableHead>Motivo</TableHead><TableHead className="text-center">Qtd</TableHead>
                <TableHead className="text-right">Custo unit.</TableHead><TableHead className="text-right">Custo total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {trocasPeriodo.length === 0 ? <TableRow><TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">Sem trocas no período.</TableCell></TableRow>
                : trocasPeriodo.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs font-mono">{formatDateBR(t.data_entrega)}</TableCell>
                    <TableCell className="text-sm font-medium">{t.colaborador_nome}</TableCell>
                    <TableCell><div className="text-sm">{t.item_nome}</div><div className="text-[11px] text-muted-foreground font-mono">{t.item_codigo}</div></TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-xs", ehPerda(t.motivo_entrega) ? "bg-rose-50 text-rose-700" : "bg-muted text-muted-foreground")}>{t.motivo_entrega || "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{t.quantidade}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{formatBRL(t.preco_unitario)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{formatBRL(t.custo)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

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
