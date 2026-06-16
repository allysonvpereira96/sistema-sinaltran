"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, GraduationCap, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TREINAMENTOS_CATALOGO, type ColaboradorTreinamento } from "@/lib/types/rh";
import { createTreinamento, deleteTreinamento } from "@/lib/actions/colaboradores";
import { formatDateBR } from "@/lib/format";
import { classificarVencimento, diasAteVencimento, prazoLabel, VENC_LABEL, VENC_TONE } from "@/lib/vencimentos";
import { cn } from "@/lib/utils";

const FORM_INICIAL = {
  treinamento: "",
  data_realizacao: "",
  validade_meses: "" as string,
  fornecedor_instrutor: "",
  observacoes: "",
};

export function TreinamentosTab({
  colaboradorId,
  treinamentos,
}: {
  colaboradorId: string;
  treinamentos: ColaboradorTreinamento[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(FORM_INICIAL);
  const [sel, setSel] = useState(""); // valor do select do catálogo
  const [custom, setCustom] = useState(false); // "Outro" — digitar livremente

  function reset() {
    setForm(FORM_INICIAL);
    setSel("");
    setCustom(false);
  }

  function handleSelectCatalogo(value: string) {
    setSel(value);
    if (value === "__outro__") {
      setCustom(true);
      setForm((f) => ({ ...f, treinamento: "" }));
      return;
    }
    setCustom(false);
    const item = TREINAMENTOS_CATALOGO.find((i) => i.nome === value);
    setForm((f) => ({
      ...f,
      treinamento: item ? item.nome : "",
      validade_meses: item?.validade_meses != null ? String(item.validade_meses) : "",
    }));
  }

  async function handleAdd() {
    if (!form.treinamento.trim()) {
      toast.error("Informe o treinamento/NR.");
      return;
    }
    if (!form.data_realizacao) {
      toast.error("Informe a data de realização.");
      return;
    }
    setSaving(true);
    const res = await createTreinamento({
      colaborador_id: colaboradorId,
      treinamento: form.treinamento.trim(),
      data_realizacao: form.data_realizacao,
      validade_meses: form.validade_meses ? Number(form.validade_meses) : null,
      fornecedor_instrutor: form.fornecedor_instrutor || null,
      observacoes: form.observacoes || null,
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Treinamento registrado");
      reset();
      setOpen(false);
      router.refresh();
    } else {
      toast.error("Erro ao registrar", { description: res.error });
    }
  }

  function handleDelete(t: ColaboradorTreinamento) {
    if (!confirm("Remover este treinamento?")) return;
    startTransition(async () => {
      const res = await deleteTreinamento(t.id, colaboradorId);
      if (res.ok) {
        toast.success("Treinamento removido");
        router.refresh();
      } else {
        toast.error("Erro ao remover", { description: res.error });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Registrar treinamento
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {treinamentos.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <GraduationCap className="size-8 opacity-40" />
              <p className="text-sm">Nenhum treinamento registrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Treinamento / NR</TableHead>
                  <TableHead>Realização</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-16 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {treinamentos.map((t) => {
                  const status = classificarVencimento(t.vencimento);
                  const tone = VENC_TONE[status];
                  const dias = diasAteVencimento(t.vencimento);
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm font-medium">
                        {t.treinamento}
                        {t.fornecedor_instrutor ? (
                          <span className="block text-xs text-muted-foreground">{t.fornecedor_instrutor}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">{formatDateBR(t.data_realizacao)}</TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {t.validade_meses ? `${t.validade_meses} meses` : "Permanente"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.vencimento ? (
                          <>
                            {formatDateBR(t.vencimento)}
                            <span className="block text-xs text-muted-foreground">{prazoLabel(dias)}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("gap-1.5 font-medium", tone.bg, tone.text)}>
                          <span className={cn("size-1.5 rounded-full", tone.dot)} />
                          {VENC_LABEL[status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => handleDelete(t)} aria-label="Remover">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar treinamento</DialogTitle>
            <DialogDescription>Escolha da lista (a validade já vem sugerida) ou use “Outro” para digitar.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Treinamento / NR *</Label>
              <select
                value={sel}
                onChange={(e) => handleSelectCatalogo(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecione…</option>
                {TREINAMENTOS_CATALOGO.map((i) => (
                  <option key={i.nome} value={i.nome}>
                    {i.nome}{i.validade_meses != null ? ` · ${i.validade_meses}m` : " · sem validade"}
                  </option>
                ))}
                <option value="__outro__">Outro (digitar)…</option>
              </select>
              {custom ? (
                <Input
                  className="mt-2"
                  value={form.treinamento}
                  onChange={(e) => setForm({ ...form, treinamento: e.target.value })}
                  placeholder="Ex.: Treinamento interno de operação"
                />
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Data de realização *</Label>
                <Input type="date" value={form.data_realizacao} onChange={(e) => setForm({ ...form, data_realizacao: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Validade (meses)</Label>
                <Input type="number" min="1" value={form.validade_meses} onChange={(e) => setForm({ ...form, validade_meses: e.target.value })} placeholder="Ex.: 24" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Fornecedor / Instrutor</Label>
              <Input value={form.fornecedor_instrutor} onChange={(e) => setForm({ ...form, fornecedor_instrutor: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Observações</Label>
              <Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancelar</Button>
            <Button disabled={saving} onClick={handleAdd}>{saving ? "Salvando…" : "Registrar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
