"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet, AlertTriangle, Coins, Repeat, Boxes, PackageX } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { EpiEntrega, EpiCatalogo } from "@/lib/actions/epi";
import { formatBRL, formatDateBR } from "@/lib/format";
import { classificarDias, diasAteVencimento, prazoLabel, VENC_LABEL, VENC_TONE } from "@/lib/vencimentos";
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
  catalogo,
}: {
  entregas: EpiEntrega[];
  colaboradores: ColabResumo[];
  catalogo: EpiCatalogo[];
}) {
  const hoje = hojeIso();
  const [tab, setTab] = useState("trocas");

  // Período compartilhado (trocas, custo por colaborador, devoluções)
  const [ini, setIni] = useState(inicioAnoIso());
  const [fim, setFim] = useState(hoje);
  const [motivo, setMotivo] = useState("todos");
  const [janelaCa, setJanelaCa] = useState("90");

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

  // Custo por colaborador (no período)
  const custoColab = useMemo(() => {
    const acc = new Map<string, { nome: string; entregas: number; qtd: number; custo: number; perdas: number }>();
    for (const e of entregas) {
      if (e.data_entrega < ini || e.data_entrega > fim) continue;
      const cur = acc.get(e.colaborador_id) ?? { nome: e.colaborador_nome, entregas: 0, qtd: 0, custo: 0, perdas: 0 };
      const custo = e.quantidade * e.preco_unitario;
      cur.entregas += 1;
      cur.qtd += e.quantidade;
      cur.custo += custo;
      if (ehPerda(e.motivo_entrega)) cur.perdas += custo;
      acc.set(e.colaborador_id, cur);
    }
    return [...acc.values()].sort((a, b) => b.custo - a.custo);
  }, [entregas, ini, fim]);
  const custoColabTotal = useMemo(() => custoColab.reduce((s, c) => s + c.custo, 0), [custoColab]);

  // CA vencidos / a vencer (catálogo)
  const itensCa = useMemo(() => {
    const limite = janelaCa === "todos" ? null : Number(janelaCa);
    return catalogo
      .filter((c) => c.validade_ca)
      .map((c) => ({ ...c, dias: diasAteVencimento(c.validade_ca) }))
      .filter((c) => (limite == null ? true : c.dias != null && c.dias <= limite))
      .sort((a, b) => (a.dias ?? 1e9) - (b.dias ?? 1e9));
  }, [catalogo, janelaCa]);
  const caVencidos = useMemo(() => itensCa.filter((c) => (c.dias ?? 1) < 0).length, [itensCa]);

  // Estoque / reposição (catálogo)
  const reposicao = useMemo(
    () =>
      catalogo
        .filter((c) => c.ativo && c.quantidade_atual <= c.quantidade_minima)
        .map((c) => {
          const repor = Math.max(0, c.quantidade_minima - c.quantidade_atual);
          return { ...c, repor, custoRepor: repor * c.preco_unitario };
        })
        .sort((a, b) => a.quantidade_atual - a.quantidade_minima - (b.quantidade_atual - b.quantidade_minima)),
    [catalogo],
  );
  const custoReposicao = useMemo(() => reposicao.reduce((s, r) => s + r.custoRepor, 0), [reposicao]);

  // Devoluções (no período)
  const devolucoes = useMemo(
    () =>
      entregas
        .filter((e) => e.data_devolucao && e.data_devolucao >= ini && e.data_devolucao <= fim)
        .sort((a, b) => (a.data_devolucao! < b.data_devolucao! ? 1 : -1)),
    [entregas, ini, fim],
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
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="trocas">Trocas pendentes ({trocas.length})</TabsTrigger>
          <TabsTrigger value="periodo">Trocas no período ({trocasPeriodo.length})</TabsTrigger>
          <TabsTrigger value="custoColab">Custo por colaborador ({custoColab.length})</TabsTrigger>
          <TabsTrigger value="ca">CA a vencer ({itensCa.length})</TabsTrigger>
          <TabsTrigger value="estoque">Estoque/reposição ({reposicao.length})</TabsTrigger>
          <TabsTrigger value="devolucoes">Devoluções ({devolucoes.length})</TabsTrigger>
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

        {/* Custo por colaborador */}
        <TabsContent value="custoColab" className="pt-4 space-y-3">
          <Card><CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Início</label>
              <Input type="date" value={ini} onChange={(e) => setIni(e.target.value)} className="h-9 w-40" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Fim</label>
              <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="h-9 w-40" />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums">{formatBRL(custoColabTotal)}</div>
                <div className="text-[11px] text-muted-foreground">custo total no período</div>
              </div>
              <Button variant="outline" size="sm" className="gap-2" disabled={custoColab.length === 0} onClick={() => baixarCsv(
                "epi-custo-por-colaborador",
                ["Colaborador", "Entregas", "Qtd", "Custo perdas", "Custo total"],
                custoColab.map((c) => [c.nome, c.entregas, c.qtd, c.perdas.toFixed(2).replace(".", ","), c.custo.toFixed(2).replace(".", ",")]),
              )}>
                <FileSpreadsheet className="size-4" />Exportar Excel
              </Button>
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Colaborador</TableHead><TableHead className="text-center">Entregas</TableHead>
                <TableHead className="text-center">Qtd</TableHead><TableHead className="text-right">Perdas</TableHead><TableHead className="text-right">Custo total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {custoColab.length === 0 ? <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">Sem entregas no período.</TableCell></TableRow>
                : custoColab.map((c) => (
                  <TableRow key={c.nome}>
                    <TableCell className="text-sm font-medium">{c.nome}</TableCell>
                    <TableCell className="text-center tabular-nums text-sm">{c.entregas}</TableCell>
                    <TableCell className="text-center tabular-nums text-sm">{c.qtd}</TableCell>
                    <TableCell className={cn("text-right tabular-nums text-sm", c.perdas > 0 && "text-rose-600 font-medium")}>{c.perdas > 0 ? formatBRL(c.perdas) : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{formatBRL(c.custo)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* CA a vencer */}
        <TabsContent value="ca" className="pt-4 space-y-3">
          <Card><CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Janela</label>
              <select value={janelaCa} onChange={(e) => setJanelaCa(e.target.value)} className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm">
                <option value="30">Vencidos e até 30 dias</option>
                <option value="60">Vencidos e até 60 dias</option>
                <option value="90">Vencidos e até 90 dias</option>
                <option value="todos">Todos com CA</option>
              </select>
            </div>
            {caVencidos > 0 && <Badge variant="secondary" className="gap-1 bg-rose-50 text-rose-700"><AlertTriangle className="size-3" />{caVencidos} com CA vencido</Badge>}
            <Button variant="outline" size="sm" className="gap-2 ml-auto" disabled={itensCa.length === 0} onClick={() => baixarCsv(
              "epi-ca-a-vencer",
              ["Código", "Item", "CA", "Validade", "Situação"],
              itensCa.map((c) => [c.codigo, c.nome, c.numero_ca ?? "", c.validade_ca ? formatDateBR(c.validade_ca) : "", VENC_LABEL[classificarDias(c.dias)]]),
            )}>
              <FileSpreadsheet className="size-4" />Exportar Excel
            </Button>
          </CardContent></Card>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Item</TableHead><TableHead>CA</TableHead><TableHead>Validade</TableHead><TableHead>Situação</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {itensCa.length === 0 ? <TableRow><TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">Nenhum CA nessa janela.</TableCell></TableRow>
                : itensCa.map((c) => {
                  const st = classificarDias(c.dias);
                  const tone = VENC_TONE[st];
                  return (
                    <TableRow key={c.id}>
                      <TableCell><div className="text-sm font-medium">{c.nome}</div><div className="text-[11px] text-muted-foreground font-mono">{c.codigo}</div></TableCell>
                      <TableCell className="text-sm tabular-nums">{c.numero_ca ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        <div>{c.validade_ca ? formatDateBR(c.validade_ca) : "—"}</div>
                        <div className="text-[11px] text-muted-foreground">{prazoLabel(c.dias)}</div>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className={cn("text-xs gap-1.5", tone.bg, tone.text)}><span className={cn("size-1.5 rounded-full", tone.dot)} />{VENC_LABEL[st]}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Estoque / reposição */}
        <TabsContent value="estoque" className="pt-4 space-y-3">
          <Card><CardContent className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><PackageX className="size-4" />Itens no/abaixo do estoque mínimo.</div>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums">{formatBRL(custoReposicao)}</div>
                <div className="text-[11px] text-muted-foreground">custo estimado de reposição</div>
              </div>
              <Button variant="outline" size="sm" className="gap-2" disabled={reposicao.length === 0} onClick={() => baixarCsv(
                "epi-reposicao-estoque",
                ["Código", "Item", "Saldo", "Mínimo", "A repor", "Custo reposição"],
                reposicao.map((r) => [r.codigo, r.nome, r.quantidade_atual, r.quantidade_minima, r.repor, r.custoRepor.toFixed(2).replace(".", ",")]),
              )}>
                <FileSpreadsheet className="size-4" />Exportar Excel
              </Button>
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Item</TableHead><TableHead className="text-center">Saldo</TableHead><TableHead className="text-center">Mínimo</TableHead>
                <TableHead className="text-center">A repor</TableHead><TableHead className="text-right">Custo reposição</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {reposicao.length === 0 ? <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">Estoque em dia — nada abaixo do mínimo. 🎉</TableCell></TableRow>
                : reposicao.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><div className="text-sm font-medium">{r.nome}</div><div className="text-[11px] text-muted-foreground font-mono">{r.codigo}</div></TableCell>
                    <TableCell className={cn("text-center tabular-nums", r.quantidade_atual <= 0 && "text-rose-600 font-semibold")}>{r.quantidade_atual}</TableCell>
                    <TableCell className="text-center tabular-nums text-sm text-muted-foreground">{r.quantidade_minima}</TableCell>
                    <TableCell className="text-center tabular-nums font-semibold">{r.repor}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(r.custoRepor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* Devoluções */}
        <TabsContent value="devolucoes" className="pt-4 space-y-3">
          <Card><CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Início</label>
              <Input type="date" value={ini} onChange={(e) => setIni(e.target.value)} className="h-9 w-40" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Fim</label>
              <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="h-9 w-40" />
            </div>
            <Button variant="outline" size="sm" className="gap-2 ml-auto" disabled={devolucoes.length === 0} onClick={() => baixarCsv(
              "epi-devolucoes",
              ["Data devolução", "Colaborador", "Item", "Qtd", "Condição", "Motivo"],
              devolucoes.map((d) => [formatDateBR(d.data_devolucao), d.colaborador_nome, d.item_nome, d.quantidade, d.condicao_devolucao ?? "", d.motivo_devolucao ?? ""]),
            )}>
              <FileSpreadsheet className="size-4" />Exportar Excel
            </Button>
          </CardContent></Card>
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Devolução</TableHead><TableHead>Colaborador</TableHead><TableHead>Item</TableHead>
                <TableHead className="text-center">Qtd</TableHead><TableHead>Condição</TableHead><TableHead>Motivo</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {devolucoes.length === 0 ? <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">Sem devoluções no período.</TableCell></TableRow>
                : devolucoes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs font-mono">{formatDateBR(d.data_devolucao)}</TableCell>
                    <TableCell className="text-sm font-medium">{d.colaborador_nome}</TableCell>
                    <TableCell className="text-sm">{d.item_nome}</TableCell>
                    <TableCell className="text-center tabular-nums">{d.quantidade}</TableCell>
                    <TableCell className="text-sm">{d.condicao_devolucao ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.motivo_devolucao ?? "—"}</TableCell>
                  </TableRow>
                ))}
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
