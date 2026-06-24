"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  registrarMovimentacaoEpi,
  type EpiMovimentacao,
  type EpiCatalogo,
} from "@/lib/actions/epi";
import { formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";

const MOTIVOS_ENTRADA = ["Compra", "Devolução", "Ajuste", "Transferência"];
const MOTIVOS_SAIDA = ["Ajuste", "Perda", "Transferência", "Descarte"];

export function MovimentacoesView({
  movimentacoes,
  itens,
}: {
  movimentacoes: EpiMovimentacao[];
  itens: EpiCatalogo[];
}) {
  const router = useRouter();
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "entrada" | "saida">("todos");

  const [open, setOpen] = useState(false);
  const [catalogoId, setCatalogoId] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [quantidade, setQuantidade] = useState("");
  const [motivo, setMotivo] = useState("Compra");
  const [numeroNf, setNumeroNf] = useState("");
  const [salvando, setSalvando] = useState(false);

  const filtradas = useMemo(
    () => (tipoFiltro === "todos" ? movimentacoes : movimentacoes.filter((m) => m.tipo === tipoFiltro)),
    [movimentacoes, tipoFiltro],
  );

  function abrir() {
    setCatalogoId(itens[0]?.id ?? "");
    setTipo("entrada");
    setQuantidade("");
    setMotivo("Compra");
    setNumeroNf("");
    setOpen(true);
  }

  async function salvar() {
    if (!catalogoId) { toast.error("Selecione um item."); return; }
    const qtd = Number(quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) { toast.error("Quantidade inválida."); return; }
    setSalvando(true);
    const res = await registrarMovimentacaoEpi({
      catalogo_id: catalogoId,
      tipo,
      quantidade: qtd,
      motivo: motivo || null,
      numero_nf: tipo === "entrada" ? numeroNf || null : null,
    });
    setSalvando(false);
    if (!res.ok) { toast.error("Erro", { description: res.error }); return; }
    toast.success("Movimentação registrada");
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1300px] mx-auto space-y-6">
      <PageHeader
        title="Movimentações de estoque"
        description="Entradas e saídas de EPI — entradas de compra, ajustes, perdas e baixas."
        actions={<Button onClick={abrir} className="gap-2"><Plus className="size-4" />Nova movimentação</Button>}
      />

      <Card>
        <CardContent className="p-4 flex items-center gap-2">
          {(["todos", "entrada", "saida"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTipoFiltro(t)}
              className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition-colors", tipoFiltro === t ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted")}>
              {t === "todos" ? "Todas" : t === "entrada" ? "Entradas" : "Saídas"}
            </button>
          ))}
          <div className="ml-auto text-xs text-muted-foreground">{filtradas.length} movimentações</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>NF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-16 text-center text-sm text-muted-foreground">Nenhuma movimentação.</TableCell></TableRow>
              ) : (
                filtradas.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-muted-foreground">{formatDateBR(m.created_at)}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{m.item_nome}</div>
                      <div className="text-xs text-muted-foreground font-mono">{m.item_codigo}</div>
                    </TableCell>
                    <TableCell>
                      {m.tipo === "entrada"
                        ? <Badge variant="secondary" className="gap-1 bg-emerald-50 text-emerald-700"><ArrowDownToLine className="size-3" />Entrada</Badge>
                        : <Badge variant="secondary" className="gap-1 bg-rose-50 text-rose-700"><ArrowUpFromLine className="size-3" />Saída</Badge>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{m.tipo === "saida" ? "−" : "+"}{m.quantidade}</TableCell>
                    <TableCell className="text-sm">{m.motivo ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.numero_nf ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova movimentação</DialogTitle>
            <DialogDescription>Entrada (compra/ajuste) ou saída (perda/ajuste) de estoque.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="inline-flex rounded-md border p-0.5 w-fit">
              <button type="button" onClick={() => { setTipo("entrada"); setMotivo("Compra"); }} className={cn("px-3 py-1.5 text-xs font-semibold rounded", tipo === "entrada" ? "bg-emerald-600 text-white" : "hover:bg-muted")}>Entrada</button>
              <button type="button" onClick={() => { setTipo("saida"); setMotivo("Ajuste"); }} className={cn("px-3 py-1.5 text-xs font-semibold rounded", tipo === "saida" ? "bg-rose-600 text-white" : "hover:bg-muted")}>Saída</button>
            </div>
            <Campo label="Item *">
              <select value={catalogoId} onChange={(e) => setCatalogoId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecione…</option>
                {itens.filter((i) => i.ativo).map((i) => <option key={i.id} value={i.id}>{i.codigo} · {i.nome} (saldo {i.quantidade_atual})</option>)}
              </select>
            </Campo>
            <Campo label="Quantidade *"><Input type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></Campo>
            <Campo label="Motivo">
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {(tipo === "entrada" ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Campo>
            {tipo === "entrada" && <Campo label="Nº da NF"><Input value={numeroNf} onChange={(e) => setNumeroNf(e.target.value)} /></Campo>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}
