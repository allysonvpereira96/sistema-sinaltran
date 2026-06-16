"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, GraduationCap, Pencil, Trash2 } from "lucide-react";
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
import type { TreinamentoCatalogo } from "@/lib/types/rh";
import {
  createTreinamentoCatalogo,
  updateTreinamentoCatalogo,
  deleteTreinamentoCatalogo,
} from "@/lib/actions/colaboradores";
import { cn } from "@/lib/utils";

export function CatalogoLista({ itens }: { itens: TreinamentoCatalogo[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<TreinamentoCatalogo | null>(null);
  const [nome, setNome] = useState("");
  const [validade, setValidade] = useState("");
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  function abrirNovo() {
    setEditando(null);
    setNome("");
    setValidade("");
    setOpen(true);
  }

  function abrirEdicao(item: TreinamentoCatalogo) {
    setEditando(item);
    setNome(item.nome);
    setValidade(item.validade_meses != null ? String(item.validade_meses) : "");
    setOpen(true);
  }

  async function salvar() {
    if (!nome.trim()) {
      toast.error("Informe o nome do treinamento.");
      return;
    }
    const validade_meses = validade.trim() ? Number(validade) : null;
    setSaving(true);
    const res = editando
      ? await updateTreinamentoCatalogo(editando.id, { nome, validade_meses })
      : await createTreinamentoCatalogo({ nome, validade_meses });
    setSaving(false);
    if (res.ok) {
      toast.success(editando ? "Treinamento atualizado" : "Treinamento adicionado");
      setOpen(false);
      router.refresh();
    } else {
      toast.error("Erro ao salvar", { description: res.error });
    }
  }

  function toggleAtivo(item: TreinamentoCatalogo) {
    startTransition(async () => {
      const res = await updateTreinamentoCatalogo(item.id, { ativo: !item.ativo });
      if (res.ok) router.refresh();
      else toast.error("Erro ao alterar", { description: res.error });
    });
  }

  function excluir(item: TreinamentoCatalogo) {
    if (!confirm(`Excluir "${item.nome}" do catálogo?`)) return;
    startTransition(async () => {
      const res = await deleteTreinamentoCatalogo(item.id);
      if (res.ok) {
        toast.success("Removido do catálogo");
        router.refresh();
      } else {
        toast.error("Erro ao remover", { description: res.error });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-2" onClick={abrirNovo}>
          <Plus className="size-4" />
          Adicionar treinamento
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {itens.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <GraduationCap className="size-8 opacity-40" />
              <p className="text-sm">Catálogo vazio.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Treinamento / NR</TableHead>
                  <TableHead>Validade padrão</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => (
                  <TableRow key={item.id} className={cn(!item.ativo && "opacity-50")}>
                    <TableCell className="text-sm font-medium">{item.nome}</TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {item.validade_meses != null ? `${item.validade_meses} meses` : "Sem validade"}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => toggleAtivo(item)} disabled={isPending} aria-label="Alternar ativo">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "gap-1.5 font-medium",
                            item.ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600",
                          )}
                        >
                          <span className={cn("size-1.5 rounded-full", item.ativo ? "bg-emerald-500" : "bg-slate-400")} />
                          {item.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" onClick={() => abrirEdicao(item)} aria-label="Editar">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => excluir(item)} aria-label="Excluir">
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
            <DialogTitle>{editando ? "Editar treinamento" : "Adicionar treinamento"}</DialogTitle>
            <DialogDescription>A validade é a sugestão padrão — pode ser ajustada em cada cadastro.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Nome / NR *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: NR-35 — Trabalho em altura" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Validade padrão (meses)</Label>
              <Input type="number" min="1" value={validade} onChange={(e) => setValidade(e.target.value)} placeholder="Vazio = sem validade" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={saving} onClick={salvar}>{saving ? "Salvando…" : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
