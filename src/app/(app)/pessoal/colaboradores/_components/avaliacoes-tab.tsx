"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Star, Trash2, ThumbsUp, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ColaboradorAvaliacao } from "@/lib/mocks/colaboradores";
import { createAvaliacao, deleteAvaliacao } from "@/lib/actions/colaboradores";
import { formatDateBR } from "@/lib/format";

const FORM_INICIAL = {
  data: "",
  periodo: "",
  nota: "",
  avaliador: "",
  pontos_fortes: "",
  pontos_melhorar: "",
  observacoes: "",
};

export function AvaliacoesTab({
  colaboradorId,
  avaliacoes,
  readOnly = false,
}: {
  colaboradorId: string;
  avaliacoes: ColaboradorAvaliacao[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(FORM_INICIAL);

  async function handleAdd() {
    if (!form.data) {
      toast.error("Informe a data da avaliação.");
      return;
    }
    const notaNum = form.nota ? Number(form.nota) : null;
    if (notaNum != null && (notaNum < 0 || notaNum > 10)) {
      toast.error("A nota deve estar entre 0 e 10.");
      return;
    }
    setSaving(true);
    const res = await createAvaliacao({
      colaborador_id: colaboradorId,
      data: form.data,
      periodo: form.periodo,
      nota: notaNum,
      avaliador: form.avaliador,
      pontos_fortes: form.pontos_fortes,
      pontos_melhorar: form.pontos_melhorar,
      observacoes: form.observacoes,
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Avaliação registrada");
      setForm(FORM_INICIAL);
      setOpen(false);
      router.refresh();
    } else {
      toast.error("Erro ao registrar", { description: res.error });
    }
  }

  function handleDelete(a: ColaboradorAvaliacao) {
    if (!confirm("Excluir esta avaliação?")) return;
    startTransition(async () => {
      const res = await deleteAvaliacao(a.id, colaboradorId);
      if (res.ok) router.refresh();
      else toast.error("Erro ao excluir", { description: res.error });
    });
  }

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex justify-end">
          <Button className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Nova avaliação
          </Button>
        </div>
      )}

      {avaliacoes.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Star className="size-8 opacity-40" />
            <p className="text-sm">Nenhuma avaliação registrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {avaliacoes.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {a.nota != null && (
                      <div className="size-12 rounded-lg bg-primary/10 grid place-items-center">
                        <span className="text-lg font-bold text-primary tabular-nums">{a.nota.toFixed(1)}</span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{a.periodo || "Avaliação"}</span>
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">{formatDateBR(a.data)}</Badge>
                      </div>
                      {a.avaliador ? <p className="text-xs text-muted-foreground mt-0.5">Avaliador: {a.avaliador}</p> : null}
                    </div>
                  </div>
                  {!readOnly && (
                    <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => handleDelete(a)} aria-label="Excluir">
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
                {(a.pontos_fortes || a.pontos_melhorar || a.observacoes) && (
                  <div className="grid gap-3 sm:grid-cols-2 mt-3 text-sm">
                    {a.pontos_fortes ? (
                      <div className="flex items-start gap-2">
                        <ThumbsUp className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{a.pontos_fortes}</span>
                      </div>
                    ) : null}
                    {a.pontos_melhorar ? (
                      <div className="flex items-start gap-2">
                        <TrendingUp className="size-4 text-amber-600 mt-0.5 shrink-0" />
                        <span>{a.pontos_melhorar}</span>
                      </div>
                    ) : null}
                    {a.observacoes ? <p className="text-muted-foreground sm:col-span-2">{a.observacoes}</p> : null}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova avaliação de desempenho</DialogTitle>
            <DialogDescription>Registre a nota e os pontos observados.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Data *</Label>
                <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Período</Label>
                <Input value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })} placeholder="2026" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Nota (0-10)</Label>
                <Input type="number" min="0" max="10" step="0.1" value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} placeholder="8.5" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Avaliador</Label>
              <Input value={form.avaliador} onChange={(e) => setForm({ ...form, avaliador: e.target.value })} placeholder="Nome do avaliador" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Pontos fortes</Label>
              <Textarea rows={2} value={form.pontos_fortes} onChange={(e) => setForm({ ...form, pontos_fortes: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Pontos a melhorar</Label>
              <Textarea rows={2} value={form.pontos_melhorar} onChange={(e) => setForm({ ...form, pontos_melhorar: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={saving} onClick={handleAdd}>{saving ? "Salvando…" : "Salvar avaliação"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
