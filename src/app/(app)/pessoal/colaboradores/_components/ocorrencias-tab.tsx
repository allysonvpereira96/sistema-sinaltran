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
import { createOcorrencia, deleteOcorrencia, registrarMovimentacao } from "@/lib/actions/colaboradores";
import { formatBRL, formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";

const TIPOS = Object.keys(OCORRENCIA_TIPO_LABEL) as OcorrenciaTipo[];
const FORM_INICIAL = {
  tipo: "observacao" as OcorrenciaTipo,
  descricao: "",
  data: "",
  valor_novo: "",
  funcao_nova: "",
};

function isMovimentacao(t: OcorrenciaTipo) {
  return t === "aumento_salario" || t === "troca_funcao";
}

export function OcorrenciasTab({
  colaboradorId,
  ocorrencias,
  readOnly = false,
  remuneracaoAtual = null,
  cargoAtual = null,
}: {
  colaboradorId: string;
  ocorrencias: ColaboradorOcorrencia[];
  readOnly?: boolean;
  remuneracaoAtual?: number | null;
  cargoAtual?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(FORM_INICIAL);

  async function handleAdd() {
    if (!form.data) {
      toast.error("Informe a data.");
      return;
    }

    setSaving(true);
    let res: { ok: true } | { ok: false; error: string };

    if (isMovimentacao(form.tipo)) {
      if (form.tipo === "aumento_salario" && !form.valor_novo) {
        setSaving(false);
        toast.error("Informe o novo salário.");
        return;
      }
      if (form.tipo === "troca_funcao" && !form.funcao_nova.trim()) {
        setSaving(false);
        toast.error("Informe a nova função.");
        return;
      }
      res = await registrarMovimentacao({
        colaborador_id: colaboradorId,
        tipo: form.tipo as "aumento_salario" | "troca_funcao",
        data: form.data,
        observacoes: form.descricao.trim() || null,
        valor_novo: form.tipo === "aumento_salario" ? Number(form.valor_novo) : null,
        funcao_nova: form.tipo === "troca_funcao" ? form.funcao_nova.trim() : null,
      });
    } else {
      if (!form.descricao.trim()) {
        setSaving(false);
        toast.error("Preencha a descrição.");
        return;
      }
      res = await createOcorrencia({
        colaborador_id: colaboradorId,
        tipo: form.tipo,
        descricao: form.descricao,
        data: form.data,
      });
    }

    setSaving(false);
    if (res.ok) {
      toast.success(isMovimentacao(form.tipo) ? "Movimentação registrada" : "Ocorrência registrada");
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
      {!readOnly && (
        <div className="flex justify-end">
          <Button className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Registrar ocorrência
          </Button>
        </div>
      )}

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
                  {!readOnly && (
                    <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => handleDelete(o)} aria-label="Excluir">
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
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
            <DialogDescription>
              Faltas, atrasos, advertências, elogios — e movimentações (aumento de salário, troca de função) que atualizam o cadastro.
            </DialogDescription>
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
            {form.tipo === "aumento_salario" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Salário atual</Label>
                  <Input value={formatBRL(remuneracaoAtual)} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Novo salário *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.valor_novo}
                    onChange={(e) => setForm({ ...form, valor_novo: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
              </div>
            )}

            {form.tipo === "troca_funcao" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Função atual</Label>
                  <Input value={cargoAtual ?? "—"} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Nova função *</Label>
                  <Input
                    value={form.funcao_nova}
                    onChange={(e) => setForm({ ...form, funcao_nova: e.target.value })}
                    placeholder="Ex.: Encarregado de obra"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                {isMovimentacao(form.tipo) ? "Observações (opcional)" : "Descrição *"}
              </Label>
              <Textarea
                rows={isMovimentacao(form.tipo) ? 2 : 3}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder={isMovimentacao(form.tipo) ? "Notas adicionais (opcional)" : "Descreva a ocorrência"}
              />
            </div>

            {form.tipo === "troca_funcao" && (
              <p className="text-xs text-muted-foreground">
                Um ASO de <span className="font-medium">mudança de função</span> será criado como pendente em Vencimentos.
              </p>
            )}
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
