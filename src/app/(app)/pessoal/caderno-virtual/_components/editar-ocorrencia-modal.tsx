"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateOcorrenciaCaderno, type OcorrenciaCaderno } from "@/lib/actions/caderno-virtual";
import {
  OCORRENCIA_TIPO_LABEL,
  tipoTemPeriodo,
  type OcorrenciaTipo,
} from "@/lib/mocks/colaboradores";

const TIPOS = Object.entries(OCORRENCIA_TIPO_LABEL) as [OcorrenciaTipo, string][];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ocorrencia: OcorrenciaCaderno | null;
};

export function EditarOcorrenciaModal({ open, onOpenChange, ocorrencia }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Inicializa a partir da ocorrência; o componente é remontado por `key` no pai.
  const [tipo, setTipo] = useState<OcorrenciaTipo>(ocorrencia?.tipo ?? "observacao");
  const [data, setData] = useState(ocorrencia?.data ?? "");
  const [dias, setDias] = useState(String(ocorrencia?.dias_atestado ?? 1));
  const [descricao, setDescricao] = useState(ocorrencia?.descricao ?? "");
  const [observacoes, setObservacoes] = useState(ocorrencia?.observacoes ?? "");

  const temPeriodo = tipoTemPeriodo(tipo);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ocorrencia) return;
    if (!descricao.trim()) {
      toast.error("Informe a descrição da ocorrência");
      return;
    }
    startTransition(async () => {
      const res = await updateOcorrenciaCaderno({
        id: ocorrencia.id,
        colaborador_id: ocorrencia.colaborador_id,
        tipo,
        descricao: descricao.trim(),
        observacoes: observacoes.trim() || null,
        data,
        dias_atestado: temPeriodo ? Math.floor(Number(dias)) || null : null,
      });
      if (!res.ok) {
        toast.error("Erro ao salvar", { description: res.error });
        return;
      }
      toast.success("Ocorrência atualizada");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar ocorrência</DialogTitle>
          <DialogDescription>
            {ocorrencia?.colaborador_nome}
            {ocorrencia?.colaborador_matricula ? ` · Mat. ${ocorrencia.colaborador_matricula}` : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                {temPeriodo ? "Data inicial *" : "Data *"}
              </Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Tipo *</Label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as OcorrenciaTipo)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {TIPOS.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {temPeriodo && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                Dias de afastamento *
              </Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={dias}
                onChange={(e) => setDias(e.target.value)}
                className="w-32"
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Descrição *</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} required />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
          </div>

          {ocorrencia?.anexo_url && (
            <p className="text-[11px] text-muted-foreground">
              O anexo (“{ocorrencia.anexo_nome ?? "arquivo"}”) é mantido. Para trocar o anexo, exclua e crie de novo.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
