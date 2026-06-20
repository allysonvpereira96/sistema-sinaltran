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
  tipoEhBancoHoras,
  tipoEhViagem,
  type OcorrenciaTipo,
} from "@/lib/mocks/colaboradores";
import { cn } from "@/lib/utils";

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
  // viagem: data de volta (a saída usa o campo `data`)
  const [dataVolta, setDataVolta] = useState(ocorrencia?.data_fim ?? ocorrencia?.data ?? "");
  const [descricao, setDescricao] = useState(ocorrencia?.descricao ?? "");
  const [observacoes, setObservacoes] = useState(ocorrencia?.observacoes ?? "");
  // banco de horas
  const bm0 = ocorrencia?.horas_minutos ?? 0;
  const [sinal, setSinal] = useState<"credito" | "debito">(bm0 < 0 ? "debito" : "credito");
  const [horasH, setHorasH] = useState(String(Math.floor(Math.abs(bm0) / 60)));
  const [horasM, setHorasM] = useState(String(Math.abs(bm0) % 60));

  const temPeriodo = tipoTemPeriodo(tipo);
  const ehBanco = tipoEhBancoHoras(tipo);
  const ehViagem = tipoEhViagem(tipo);

  const totalMin = (Number(horasH) || 0) * 60 + (Number(horasM) || 0);
  const diasViagem = ehViagem ? diasEntreDatas(data, dataVolta) : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ocorrencia) return;
    if (ehBanco && totalMin === 0) {
      toast.error("Informe as horas (crédito ou débito)");
      return;
    }
    if (!ehBanco && !descricao.trim()) {
      toast.error("Informe a descrição da ocorrência");
      return;
    }
    if (ehViagem) {
      if (!dataVolta) {
        toast.error("Informe a data de volta");
        return;
      }
      if (dataVolta < data) {
        toast.error("A data de volta deve ser igual ou posterior à data de saída");
        return;
      }
    }
    startTransition(async () => {
      const res = await updateOcorrenciaCaderno({
        id: ocorrencia.id,
        colaborador_id: ocorrencia.colaborador_id,
        tipo,
        descricao: descricao.trim(),
        observacoes: observacoes.trim() || null,
        data,
        dias_atestado: ehViagem
          ? diasViagem || null
          : temPeriodo
            ? Math.floor(Number(dias)) || null
            : null,
        horas_minutos: ehBanco ? (sinal === "debito" ? -totalMin : totalMin) : null,
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
                {ehViagem ? "Data de saída *" : temPeriodo ? "Data inicial *" : "Data *"}
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

          {ehViagem && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                Data de volta *
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  min={data || undefined}
                  value={dataVolta}
                  onChange={(e) => setDataVolta(e.target.value)}
                  className="w-44"
                  required
                />
                <span className="text-xs text-muted-foreground">
                  {diasViagem > 0
                    ? `${diasViagem} ${diasViagem === 1 ? "dia" : "dias"} de viagem`
                    : "Informe a data de volta"}
                </span>
              </div>
            </div>
          )}

          {temPeriodo && !ehViagem && (
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

          {ehBanco && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                Horas *
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex rounded-md border p-0.5">
                  <button type="button" onClick={() => setSinal("credito")}
                    className={cn("px-3 py-1.5 text-xs font-semibold rounded", sinal === "credito" ? "bg-emerald-600 text-white" : "hover:bg-muted")}>
                    + Crédito
                  </button>
                  <button type="button" onClick={() => setSinal("debito")}
                    className={cn("px-3 py-1.5 text-xs font-semibold rounded", sinal === "debito" ? "bg-rose-600 text-white" : "hover:bg-muted")}>
                    − Débito
                  </button>
                </div>
                <Input type="number" min={0} value={horasH} onChange={(e) => setHorasH(e.target.value)} className="w-20" aria-label="Horas" />
                <span className="text-sm text-muted-foreground">h</span>
                <Input type="number" min={0} max={59} value={horasM} onChange={(e) => setHorasM(e.target.value)} className="w-20" aria-label="Minutos" />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              {ehBanco ? "Descrição" : "Descrição *"}
            </Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder={ehBanco ? "Opcional — gerada automaticamente se vazia" : undefined}
              required={!ehBanco}
            />
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

/** Nº de dias inclusivos entre duas datas ISO (volta − saída + 1). 0 se inválido. */
function diasEntreDatas(inicio: string, fim: string): number {
  if (!inicio || !fim) return 0;
  const [y1, m1, d1] = inicio.split("-").map(Number);
  const [y2, m2, d2] = fim.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  if (b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}
