"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Undo2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { devolverEpi, type EpiEntrega } from "@/lib/actions/epi";
import { formatDateBR, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filtro = "todos" | "em_uso" | "devolvido";

function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function EntregasView({ entregas }: { entregas: EpiEntrega[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const hoje = hojeIso();

  const [dev, setDev] = useState<EpiEntrega | null>(null);
  const [devData, setDevData] = useState(hoje);
  const [devMotivo, setDevMotivo] = useState("");
  const [devCondicao, setDevCondicao] = useState<"aproveitavel" | "descarte">("descarte");
  const [salvando, setSalvando] = useState(false);

  const filtradas = useMemo(() => {
    const q = normalizeSearch(busca);
    return entregas.filter((e) => {
      if (filtro === "em_uso" && e.data_devolucao) return false;
      if (filtro === "devolvido" && !e.data_devolucao) return false;
      if (q && !normalizeSearch(`${e.colaborador_nome} ${e.item_nome} ${e.item_codigo}`).includes(q)) return false;
      return true;
    });
  }, [entregas, busca, filtro]);

  function abrirDev(e: EpiEntrega) {
    setDev(e);
    setDevData(hoje);
    setDevMotivo("");
    setDevCondicao("descarte");
  }
  async function salvarDev() {
    if (!dev) return;
    setSalvando(true);
    const res = await devolverEpi({
      id: dev.id,
      data_devolucao: devData,
      motivo_devolucao: devMotivo || null,
      condicao_devolucao: devCondicao,
    });
    setSalvando(false);
    if (!res.ok) { toast.error("Erro ao registrar devolução", { description: res.error }); return; }
    toast.success("Devolução registrada");
    setDev(null);
    router.refresh();
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Entregas de EPI"
        description="Histórico de entregas por colaborador, trocas previstas e devoluções."
        actions={
          <Link href="/almoxarifado/epi/nova-entrega" className={cn(buttonVariants({}), "gap-2")}>
            <Plus className="size-4" />Nova entrega
          </Link>
        }
      />

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 h-10 w-full lg:w-80 rounded-md border bg-background px-3 text-sm">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar colaborador ou item…" className="flex-1 bg-transparent outline-none" />
          </div>
          {(["todos", "em_uso", "devolvido"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFiltro(f)}
              className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition-colors", filtro === f ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted")}>
              {f === "todos" ? "Todas" : f === "em_uso" ? "Em uso" : "Devolvidas"}
            </button>
          ))}
          <div className="ml-auto text-xs text-muted-foreground">{filtradas.length} entregas</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Troca prevista</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">Nenhuma entrega.</TableCell></TableRow>
              ) : (
                filtradas.map((e) => {
                  const emUso = !e.data_devolucao;
                  const vencida = emUso && e.data_prevista_troca && e.data_prevista_troca < hoje;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm font-medium">{e.colaborador_nome}</TableCell>
                      <TableCell>
                        <div className="text-sm">{e.item_nome}</div>
                        <div className="text-xs text-muted-foreground font-mono">{e.item_codigo} · {e.motivo_entrega}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{e.quantidade}</TableCell>
                      <TableCell className="text-xs">{formatDateBR(e.data_entrega)}</TableCell>
                      <TableCell className="text-xs">
                        {e.data_prevista_troca ? (
                          <span className={cn(vencida && "text-rose-600 font-semibold")}>
                            {formatDateBR(e.data_prevista_troca)}
                            {vencida && <AlertTriangle className="inline size-3 ml-1" />}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {emUso
                          ? <Badge variant="secondary" className={cn(vencida ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>{vencida ? "Troca vencida" : "Em uso"}</Badge>
                          : <Badge variant="secondary" className="bg-slate-100 text-slate-600">Devolvido {formatDateBR(e.data_devolucao)}</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {emUso && (
                          <Button variant="ghost" size="icon-sm" onClick={() => abrirDev(e)} aria-label="Registrar devolução">
                            <Undo2 className="size-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dev !== null} onOpenChange={(o) => { if (!o) setDev(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar devolução</DialogTitle>
            <DialogDescription>{dev?.item_nome} · {dev?.colaborador_nome}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Data da devolução *</Label>
              <Input type="date" value={devData} onChange={(e) => setDevData(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Condição</Label>
              <div className="inline-flex rounded-md border p-0.5">
                <button type="button" onClick={() => setDevCondicao("aproveitavel")} className={cn("px-3 py-1.5 text-xs font-semibold rounded", devCondicao === "aproveitavel" ? "bg-emerald-600 text-white" : "hover:bg-muted")}>Aproveitável (volta ao estoque)</button>
                <button type="button" onClick={() => setDevCondicao("descarte")} className={cn("px-3 py-1.5 text-xs font-semibold rounded", devCondicao === "descarte" ? "bg-rose-600 text-white" : "hover:bg-muted")}>Descarte</button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Motivo</Label>
              <Input value={devMotivo} onChange={(e) => setDevMotivo(e.target.value)} placeholder="Ex.: desgaste, fim de contrato…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDev(null)}>Cancelar</Button>
            <Button onClick={salvarDev} disabled={salvando}>{salvando ? "Salvando…" : "Confirmar devolução"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
