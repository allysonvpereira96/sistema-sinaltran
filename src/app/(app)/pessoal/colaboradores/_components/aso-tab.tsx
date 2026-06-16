"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, HeartPulse, Trash2 } from "lucide-react";
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
  ASO_TIPO_LABEL,
  ASO_RESULTADO_LABEL,
  ASO_PERIODICIDADES,
  type ColaboradorAso,
  type AsoTipoExame,
} from "@/lib/types/rh";
import { createAso, deleteAso } from "@/lib/actions/colaboradores";
import { formatDateBR } from "@/lib/format";
import { classificarVencimento, diasAteVencimento, prazoLabel, VENC_LABEL, VENC_TONE } from "@/lib/vencimentos";
import { cn } from "@/lib/utils";

const TIPOS = Object.keys(ASO_TIPO_LABEL) as AsoTipoExame[];

const FORM_INICIAL = {
  tipo_exame: "periodico" as string,
  data_realizacao: "",
  periodicidade_meses: 12,
  resultado: "" as string,
  responsavel: "",
  observacoes: "",
};

export function AsoTab({
  colaboradorId,
  aso,
  readOnly = false,
}: {
  colaboradorId: string;
  aso: ColaboradorAso[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(FORM_INICIAL);

  async function handleAdd() {
    if (!form.data_realizacao) {
      toast.error("Informe a data de realização.");
      return;
    }
    setSaving(true);
    const res = await createAso({
      colaborador_id: colaboradorId,
      tipo_exame: form.tipo_exame,
      data_realizacao: form.data_realizacao,
      periodicidade_meses: Number(form.periodicidade_meses),
      resultado: form.resultado || null,
      responsavel: form.responsavel || null,
      observacoes: form.observacoes || null,
    });
    setSaving(false);
    if (res.ok) {
      toast.success("ASO registrado");
      setForm(FORM_INICIAL);
      setOpen(false);
      router.refresh();
    } else {
      toast.error("Erro ao registrar", { description: res.error });
    }
  }

  function handleDelete(a: ColaboradorAso) {
    if (!confirm("Remover este ASO?")) return;
    startTransition(async () => {
      const res = await deleteAso(a.id, colaboradorId);
      if (res.ok) {
        toast.success("ASO removido");
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
            Registrar ASO
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {aso.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <HeartPulse className="size-8 opacity-40" />
              <p className="text-sm">Nenhum ASO registrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Realização</TableHead>
                  <TableHead>Periodicidade</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Situação</TableHead>
                  {!readOnly && <TableHead className="w-16 text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {aso.map((a) => {
                  const status = classificarVencimento(a.vencimento);
                  const tone = VENC_TONE[status];
                  const dias = diasAteVencimento(a.vencimento);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm font-medium">
                        {ASO_TIPO_LABEL[a.tipo_exame] ?? a.tipo_exame}
                        {a.resultado ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            · {ASO_RESULTADO_LABEL[a.resultado] ?? a.resultado}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">{formatDateBR(a.data_realizacao)}</TableCell>
                      <TableCell className="text-sm tabular-nums">{a.periodicidade_meses} meses</TableCell>
                      <TableCell className="text-sm">
                        {formatDateBR(a.vencimento)}
                        <span className="block text-xs text-muted-foreground">{prazoLabel(dias)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("gap-1.5 font-medium", tone.bg, tone.text)}>
                          <span className={cn("size-1.5 rounded-full", tone.dot)} />
                          {VENC_LABEL[status]}
                        </Badge>
                      </TableCell>
                      {!readOnly && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => handleDelete(a)} aria-label="Remover">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar ASO</DialogTitle>
            <DialogDescription>O vencimento é calculado pela data + periodicidade.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Tipo de exame</Label>
                <select
                  value={form.tipo_exame}
                  onChange={(e) => setForm({ ...form, tipo_exame: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>{ASO_TIPO_LABEL[t]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Periodicidade</Label>
                <select
                  value={form.periodicidade_meses}
                  onChange={(e) => setForm({ ...form, periodicidade_meses: Number(e.target.value) })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {ASO_PERIODICIDADES.map((p) => (
                    <option key={p.meses} value={p.meses}>{p.label} ({p.meses}m)</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Data de realização *</Label>
                <Input type="date" value={form.data_realizacao} onChange={(e) => setForm({ ...form, data_realizacao: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Resultado</Label>
                <select
                  value={form.resultado}
                  onChange={(e) => setForm({ ...form, resultado: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">—</option>
                  {Object.entries(ASO_RESULTADO_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Responsável / Clínica</Label>
              <Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} placeholder="Ex.: Clínica do Trabalho" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Observações</Label>
              <Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
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
