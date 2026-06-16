"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Trash2 } from "lucide-react";
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
import type { ColaboradorDependente } from "@/lib/mocks/colaboradores";
import { createDependente, deleteDependente } from "@/lib/actions/colaboradores";
import { formatDateBR } from "@/lib/format";

export function DependentesTab({
  colaboradorId,
  dependentes,
}: {
  colaboradorId: string;
  dependentes: ColaboradorDependente[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({ nome: "", parentesco: "", data_nascimento: "", cpf: "" });

  async function handleAdd() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do dependente.");
      return;
    }
    setSaving(true);
    const res = await createDependente({ colaborador_id: colaboradorId, ...form });
    setSaving(false);
    if (res.ok) {
      toast.success("Dependente adicionado");
      setForm({ nome: "", parentesco: "", data_nascimento: "", cpf: "" });
      setOpen(false);
      router.refresh();
    } else {
      toast.error("Erro ao adicionar", { description: res.error });
    }
  }

  function handleDelete(d: ColaboradorDependente) {
    if (!confirm(`Remover o dependente "${d.nome}"?`)) return;
    startTransition(async () => {
      const res = await deleteDependente(d.id, colaboradorId);
      if (res.ok) {
        toast.success("Dependente removido");
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
          Adicionar dependente
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {dependentes.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Users className="size-8 opacity-40" />
              <p className="text-sm">Nenhum dependente cadastrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Parentesco</TableHead>
                  <TableHead>Nascimento</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead className="w-16 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dependentes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.nome}</TableCell>
                    <TableCell className="text-sm">{d.parentesco ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatDateBR(d.data_nascimento)}</TableCell>
                    <TableCell className="text-sm">{d.cpf ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => handleDelete(d)} aria-label="Remover">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TableCell>
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
            <DialogTitle>Adicionar dependente</DialogTitle>
            <DialogDescription>Vincule um dependente ao colaborador.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome do dependente" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Parentesco</Label>
                <Input value={form.parentesco} onChange={(e) => setForm({ ...form, parentesco: e.target.value })} placeholder="Ex.: Filho(a)" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Nascimento</Label>
                <Input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">CPF</Label>
              <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="Somente números" />
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
