"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Boxes, AlertTriangle, PackageX, Wallet, Check } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { setEstoqueMinimoEpi, type EpiCatalogo } from "@/lib/actions/epi";
import { formatBRL, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";

type Situacao = "ok" | "critico" | "zerado";
function situacao(i: EpiCatalogo): Situacao {
  if (i.quantidade_atual <= 0) return "zerado";
  if (i.quantidade_atual <= i.quantidade_minima) return "critico";
  return "ok";
}

export function EstoqueView({ itens }: { itens: EpiCatalogo[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [soCriticos, setSoCriticos] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editMin, setEditMin] = useState("");

  const ativos = useMemo(() => itens.filter((i) => i.ativo), [itens]);

  const kpis = useMemo(() => {
    const criticos = ativos.filter((i) => situacao(i) === "critico").length;
    const zerados = ativos.filter((i) => situacao(i) === "zerado").length;
    const valor = ativos.reduce((s, i) => s + i.quantidade_atual * i.preco_unitario, 0);
    return { total: ativos.length, criticos, zerados, valor };
  }, [ativos]);

  const filtrados = useMemo(() => {
    const q = normalizeSearch(busca);
    return ativos.filter((i) => {
      if (soCriticos && situacao(i) === "ok") return false;
      if (q && !normalizeSearch(`${i.nome} ${i.codigo}`).includes(q)) return false;
      return true;
    });
  }, [ativos, busca, soCriticos]);

  async function salvarMin(i: EpiCatalogo) {
    const n = Number(editMin);
    const res = await setEstoqueMinimoEpi(i.id, Number.isFinite(n) ? n : 0);
    if (!res.ok) {
      toast.error("Erro ao salvar mínimo", { description: res.error });
      return;
    }
    toast.success("Estoque mínimo atualizado");
    setEditId(null);
    router.refresh();
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader title="Estoque de EPI" description="Saldos por item, alertas de mínimo e valor em estoque." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Itens" value={String(kpis.total)} icon={Boxes} tone="ok" />
        <Kpi label="Estoque crítico" value={String(kpis.criticos)} detail="≤ mínimo" icon={AlertTriangle} tone={kpis.criticos ? "alert" : "ok"} />
        <Kpi label="Zerados" value={String(kpis.zerados)} icon={PackageX} tone={kpis.zerados ? "alert" : "ok"} />
        <Kpi label="Valor em estoque" value={formatBRL(kpis.valor)} icon={Wallet} tone="ok" />
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 h-10 w-full lg:w-80 rounded-md border bg-background px-3 text-sm">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar item…" className="flex-1 bg-transparent outline-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={soCriticos} onChange={(e) => setSoCriticos(e.target.checked)} className="size-4 rounded border-input" />
            Só críticos/zerados
          </label>
          <div className="ml-auto text-xs text-muted-foreground">{filtrados.length} itens</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Atual</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-16 text-center text-sm text-muted-foreground">Nenhum item.</TableCell></TableRow>
              ) : (
                filtrados.map((i) => {
                  const s = situacao(i);
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        <div className="font-medium">{i.nome}</div>
                        <div className="text-xs text-muted-foreground font-mono">{i.codigo}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={cn(s !== "ok" && "text-rose-600 font-semibold")}>{i.quantidade_atual}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {editId === i.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input type="number" min="0" value={editMin} onChange={(e) => setEditMin(e.target.value)} className="w-20 h-8" />
                            <Button size="icon-sm" onClick={() => salvarMin(i)} aria-label="Salvar"><Check className="size-3.5" /></Button>
                          </div>
                        ) : (
                          <button type="button" className="hover:underline" onClick={() => { setEditId(i.id); setEditMin(String(i.quantidade_minima)); }}>
                            {i.quantidade_minima}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {s === "ok" && <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">Em dia</Badge>}
                        {s === "critico" && <Badge variant="secondary" className="bg-amber-50 text-amber-700">Crítico</Badge>}
                        {s === "zerado" && <Badge variant="secondary" className="bg-rose-50 text-rose-700">Zerado</Badge>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{formatBRL(i.quantidade_atual * i.preco_unitario)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

type Tone = "ok" | "alert";
function Kpi({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail?: string; icon: React.ComponentType<{ className?: string }>; tone: Tone }) {
  const tones = { ok: "bg-emerald-50 text-emerald-600", alert: "bg-rose-50 text-rose-600" };
  return (
    <Card>
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className="text-2xl font-bold mt-2">{value}</div>
          {detail ? <div className="text-xs text-muted-foreground mt-1">{detail}</div> : null}
        </div>
        <div className={cn("size-10 rounded-lg grid place-items-center", tones[tone])}><Icon className="size-5" /></div>
      </CardContent>
    </Card>
  );
}
