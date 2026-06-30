"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { marcarRecebida } from "@/lib/actions/medicoes";
import {
  FORMA_RECEBIMENTO_LABEL,
  type FormaRecebimento,
} from "@/lib/types/medicao";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

const FORMAS: FormaRecebimento[] = [
  "boleto",
  "transferencia",
  "pix",
  "cheque",
  "dinheiro",
];

const hoje = () => new Date().toISOString().slice(0, 10);

/**
 * Dialog de baixa do recebível: registra valor recebido (permite parcial),
 * data e forma de recebimento. `trigger` é o elemento que abre o dialog.
 */
export function BaixaDialog({
  medicaoId,
  valorTotal,
  formaPadrao,
  trigger,
}: {
  medicaoId: string;
  valorTotal: number;
  formaPadrao?: FormaRecebimento | null;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(valorTotal);
  const [data, setData] = useState(hoje());
  const [forma, setForma] = useState<FormaRecebimento | "">(formaPadrao ?? "");
  const [pending, setPending] = useState(false);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // Recarrega os defaults a cada abertura.
      setValor(valorTotal);
      setData(hoje());
      setForma(formaPadrao ?? "");
    }
  }

  const parcial = valor > 0 && valor < valorTotal;

  async function confirmar() {
    setPending(true);
    const res = await marcarRecebida(medicaoId, true, {
      valor_recebido: valor,
      data_recebimento: data,
      forma_recebimento: forma || null,
    });
    setPending(false);
    if (!res.ok) {
      toast.error("Erro ao registrar recebimento", { description: res.error });
      return;
    }
    toast.success(parcial ? "Recebimento parcial registrado" : "Recebimento registrado");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<span className="contents" />}>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar recebimento</DialogTitle>
          <DialogDescription>
            Valor faturado da medição: {formatBRL(valorTotal)}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Valor recebido
            </Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={Number.isNaN(valor) ? "" : valor}
              onChange={(e) => setValor(e.target.valueAsNumber)}
            />
            {parcial ? (
              <p className="text-xs text-amber-600 font-medium">
                Parcial — saldo de {formatBRL(valorTotal - valor)} continua a receber.
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Data do recebimento
            </Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Forma de recebimento
            </Label>
            <select
              value={forma}
              onChange={(e) => setForma(e.target.value as FormaRecebimento | "")}
              className={cn(
                "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
            >
              <option value="">—</option>
              {FORMAS.map((f) => (
                <option key={f} value={f}>
                  {FORMA_RECEBIMENTO_LABEL[f]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
          <Button onClick={confirmar} disabled={pending || !(valor > 0)} className="gap-2">
            <BadgeCheck className="size-4" />
            {pending ? "Salvando…" : "Confirmar recebimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
