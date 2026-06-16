"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Plane, Trash2 } from "lucide-react";
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
import {
  FERIAS_STATUS_LABEL,
  type ColaboradorFerias,
} from "@/lib/mocks/colaboradores";
import { createFerias, deleteFerias } from "@/lib/actions/colaboradores";
import { formatDateBR } from "@/lib/format";

type FeriasStatus = ColaboradorFerias["status"];
const STATUS_VALUES: FeriasStatus[] = ["agendada", "em_gozo", "concluida"];

function diasEntre(inicio: string, fim: string): number {
  if (!inicio || !fim) return 0;
  const ms = new Date(fim).getTime() - new Date(inicio).getTime();
  return ms >= 0 ? Math.round(ms / 86_400_000) + 1 : 0;
}

const FORM_INICIAL = {
  periodo_aquisitivo_inicio: "",
  periodo_aquisitivo_fim: "",
  data_inicio: "",
  data_fim: "",
  status: "agendada" as FeriasStatus,
};

export function FeriasTab({
  colaboradorId,
  ferias,
  readOnly = false,
}: {
  colaboradorId: string;
  ferias: ColaboradorFerias[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(FORM_INICIAL);

  const dias = diasEntre(form.data_inicio, form.data_fim);

  async function handleAdd() {
    if (!form.data_inicio || !form.data_fim) {
      toast.error("Informe as datas de início e fim.");
      return;
    }
    if (dias <= 0) {
      toast.error("A data de fim deve ser posterior à de início.");
      return;
    }
    setSaving(true);
    const res = await createFerias({ colaborador_id: colaboradorId, ...form, dias });
    setSaving(false);
    if (res.ok) {
      toast.success("Período de férias adicionado");
      setForm(FORM_INICIAL);
      setOpen(false);
      router.refresh();
    } else {
      toast.error("Erro ao adicionar", { description: res.error });
    }
  }

  function handleDelete(f: ColaboradorFerias) {
    if (!confirm("Remover este período de férias?")) return;
    startTransition(async () => {
      const res = await deleteFerias(f.id, colaboradorId);
      if (res.ok) {
        toast.success("Período removido");
        router.refresh();
      } else {
        toast.error("Erro ao remover", { description: res.error });
      }
    });
  }

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex justify-end">
          <Button className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Adicionar período
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {ferias.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Plane className="size-8 opacity-40" />
              <p className="text-sm">Nenhum período de férias registrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período aquisitivo</TableHead>
                  <TableHead>Gozo</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                  <TableHead>Status</TableHead>
                  {!readOnly && <TableHead className="w-16 text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ferias.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-sm">
                      {formatDateBR(f.periodo_aquisitivo_inicio)} → {formatDateBR(f.periodo_aquisitivo_fim)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateBR(f.data_inicio)} → {formatDateBR(f.data_fim)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{f.dias}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">
                        {FERIAS_STATUS_LABEL[f.status]}
                      </Badge>
                    </TableCell>
                    {!readOnly && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => handleDelete(f)} aria-label="Remover">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar período de férias</DialogTitle>
            <DialogDescription>Registre as datas de gozo e o período aquisitivo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Aquisitivo (início)</Label>
                <Input type="date" value={form.periodo_aquisitivo_inicio} onChange={(e) => setForm({ ...form, periodo_aquisitivo_inicio: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Aquisitivo (fim)</Label>
                <Input type="date" value={form.periodo_aquisitivo_fim} onChange={(e) => setForm({ ...form, periodo_aquisitivo_fim: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Gozo (início) *</Label>
                <Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Gozo (fim) *</Label>
                <Input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Dias</Label>
                <Input value={dias || ""} readOnly disabled placeholder="Calculado" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as FeriasStatus })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {STATUS_VALUES.map((s) => (
                    <option key={s} value={s}>
                      {FERIAS_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={saving} onClick={handleAdd}>{saving ? "Salvando…" : "Adicionar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
