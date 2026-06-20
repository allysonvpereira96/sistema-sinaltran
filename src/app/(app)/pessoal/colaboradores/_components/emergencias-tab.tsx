"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, HeartPulse, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
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
import type { ColaboradorEmergencia } from "@/lib/mocks/colaboradores";
import { createEmergencia, deleteEmergencia } from "@/lib/actions/colaboradores";
import { formatTelefone } from "@/lib/format";

export function EmergenciasTab({
  colaboradorId,
  emergencias,
  readOnly = false,
}: {
  colaboradorId: string;
  emergencias: ColaboradorEmergencia[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ nome: "", parentesco: "", telefone: "" });

  async function handleAdd() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do contato.");
      return;
    }
    setSaving(true);
    const res = await createEmergencia({ colaborador_id: colaboradorId, ...form });
    setSaving(false);
    if (res.ok) {
      toast.success("Contato adicionado");
      setForm({ nome: "", parentesco: "", telefone: "" });
      setOpen(false);
      router.refresh();
    } else {
      toast.error("Erro ao adicionar", { description: res.error });
    }
  }

  function handleDelete(e: ColaboradorEmergencia) {
    if (!confirm(`Remover o contato "${e.nome}"?`)) return;
    startTransition(async () => {
      const res = await deleteEmergencia(e.id, colaboradorId);
      if (res.ok) {
        toast.success("Contato removido");
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
            Adicionar contato
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {emergencias.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <HeartPulse className="size-8 opacity-40" />
              <p className="text-sm">Nenhum contato de emergência cadastrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Parentesco</TableHead>
                  <TableHead>Telefone</TableHead>
                  {!readOnly && <TableHead className="w-16 text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {emergencias.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.nome}</TableCell>
                    <TableCell className="text-sm">{e.parentesco ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatTelefone(e.telefone)}</TableCell>
                    {!readOnly && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => handleDelete(e)} aria-label="Remover">
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
            <DialogTitle>Adicionar contato de emergência</DialogTitle>
            <DialogDescription>Vincule um contato de emergência ao colaborador.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Nome *</Label>
              <Input value={form.nome} onChange={(ev) => setForm({ ...form, nome: ev.target.value })} placeholder="Nome do contato" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Parentesco</Label>
                <Input value={form.parentesco} onChange={(ev) => setForm({ ...form, parentesco: ev.target.value })} placeholder="Ex.: Esposa" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Telefone</Label>
                <Input value={form.telefone} onChange={(ev) => setForm({ ...form, telefone: ev.target.value })} placeholder="(54) 99999-9999" />
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
