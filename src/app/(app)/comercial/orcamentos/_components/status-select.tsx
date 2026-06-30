"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ORCAMENTO_STATUS_LABEL,
  ORCAMENTO_STATUS_TONE,
  type OrcamentoStatus,
} from "@/lib/types/orcamento";
import { setOrcamentoStatus } from "@/lib/actions/orcamentos";
import { cn } from "@/lib/utils";

const ORDEM: OrcamentoStatus[] = [
  "rascunho",
  "enviado",
  "aprovado",
  "rejeitado",
  "perdido",
];

/**
 * Badge de status que abre um menu para mudar o status do orçamento.
 * Não gera obra — apenas atualiza o status (aprovar, rejeitar, marcar perdido…).
 * A geração de obra continua no botão dedicado "Aprovar e gerar obra".
 */
export function StatusSelect({
  orcamentoId,
  status,
  size = "sm",
}: {
  orcamentoId: string;
  status: OrcamentoStatus;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const tone = ORCAMENTO_STATUS_TONE[status];

  function alterar(novo: OrcamentoStatus) {
    if (novo === status) return;
    startTransition(async () => {
      const res = await setOrcamentoStatus(orcamentoId, novo);
      if (res.ok) {
        toast.success(`Status alterado para "${ORCAMENTO_STATUS_LABEL[novo]}"`);
        router.refresh();
      } else {
        toast.error("Não foi possível alterar o status", {
          description: res.error,
        });
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-transparent font-medium transition-opacity hover:opacity-80 disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          tone.bg,
          tone.text,
          size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        )}
        aria-label="Alterar status"
        title="Clique para alterar o status"
      >
        <span className={cn("size-1.5 rounded-full", tone.dot)} />
        {ORCAMENTO_STATUS_LABEL[status]}
        <ChevronDown className="size-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {ORDEM.map((s) => {
          const t = ORCAMENTO_STATUS_TONE[s];
          return (
            <DropdownMenuItem
              key={s}
              onClick={() => alterar(s)}
              className="gap-2"
            >
              <span className={cn("size-1.5 rounded-full", t.dot)} />
              <span className="flex-1">{ORCAMENTO_STATUS_LABEL[s]}</span>
              {s === status ? <Check className="size-3.5 opacity-70" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
