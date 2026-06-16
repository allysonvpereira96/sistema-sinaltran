"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, NotebookPen, Trash2 } from "lucide-react";
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
import {
  OCORRENCIA_TIPO_LABEL,
  OCORRENCIA_TIPO_TONE,
  type ColaboradorOcorrencia,
  type OcorrenciaTipo,
} from "@/lib/mocks/colaboradores";
import { createOcorrencia, deleteOcorrencia } from "@/lib/actions/colaboradores";
import { formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";

const TIPOS = Object.keys(OCORRENCIA_TIPO_LABEL) as OcorrenciaTipo[];
const FORM_INICIAL = { tipo: "observacao" as OcorrenciaTipo, descricao: "", data: "" };

export function OcorrenciasTab({
  colaboradorId,
  ocorrencias,
}: {
  colaboradorId: string;
  ocorrencias: ColaboradorOcorrencia[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(FORM_INICIAL);

  async function handleAdd() {
    if (!form.descricao.trim() || !form.data) {
      toast.error("Preencha descrição e data.");
      return;
    }
    setSaving(true);
    const res = await createOcorrencia({ colaborador_id: colaboradorId, ...form });
    setSaving(false);
    if (res.ok) {
      toast.success("Ocorrência registrada");
      setForm(FORM_INICIAL);
      setOpen(false);
      router.refresh();
    } else {
      toast.error("Erro ao registrar", { description: res.error });
    }
  }

  function handleDelete(o: ColaboradorOcorrencia) {
    if (!confirm("Excluir esta ocorrência?")) return;
    startTransition(async () => {
      const res = await deleteOcorrencia(o.id, colaboradorId);
      if (res.ok) router.refresh();
      else toast.error("Erro ao excluir", { description: res.error });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Registrar ocorrência
        </Button>
      </div>

      {ocorrencias.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <NotebookPen className="size-8 opacity-40" />
            <p className="text-sm">Nenhuma ocorrência registrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ocorrencias.map((o) => {
            const tone = OCORRENCIA_TIPO_TONE[o.tipo];
            return (
              <Card key={o.id}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={cn("font-medium", tone.bg, tone.text)}>
                        {OCORRENCIA_TIPO_LABEL[o.tipo]}
                      </Badge>
                      <span className="text-xs font-mono text-muted-foreground">{formatDateBR(o.data)}</span>
                    </div>
                    <p className="text-sm mt-1.5 whitespace-pre-wrap break-words">{o.descricao}</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => handleDelete(o)} aria-label="Excluir">
                    <Trash2 className="size-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar ocorrência</DialogTitle>
            <DialogDescription>Caderno virtual: faltas, atrasos, advertências, elogios…</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Tipo</Label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value as OcorrenciaTipo })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {OCORRENCIA_TIPO_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Data *</Label>
                <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Descrição *</Label>
              <Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descreva a ocorrência" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={saving} onClick={handleAdd}>{saving ? "Salvando…" : "Registrar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
