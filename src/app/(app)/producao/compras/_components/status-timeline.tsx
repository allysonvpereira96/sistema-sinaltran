import { Check, Ban } from "lucide-react";
import {
  COMPRA_STATUS_ORDER,
  COMPRA_STATUS_LABEL,
  type CompraStatus,
  type CompraHistorico,
} from "@/lib/types/compras";
import { formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Linha do tempo horizontal do fluxo do pedido (Solicitação → … → Retirada).
 * Etapas concluídas ficam preenchidas; a atual é destacada; futuras ficam esmaecidas.
 */
export function StatusTimeline({
  status,
  historico,
  size = "md",
}: {
  status: CompraStatus;
  historico?: CompraHistorico[];
  size?: "sm" | "md";
}) {
  const cancelado = status === "cancelado";
  const atualIdx = cancelado
    ? -1
    : COMPRA_STATUS_ORDER.indexOf(status as Exclude<CompraStatus, "cancelado">);

  // data em que cada etapa foi alcançada (primeira transição para o status)
  const dataPorStatus = new Map<string, string>();
  for (const h of historico ?? []) {
    if (!dataPorStatus.has(h.para_status)) dataPorStatus.set(h.para_status, h.created_at);
  }

  const dot = size === "sm" ? "size-5" : "size-7";
  const icon = size === "sm" ? "size-3" : "size-4";

  return (
    <div className="w-full">
      {cancelado ? (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
          <Ban className="size-3.5" />
          Pedido cancelado
        </div>
      ) : null}
      <ol className="flex items-start">
        {COMPRA_STATUS_ORDER.map((etapa, i) => {
          const concluida = !cancelado && i < atualIdx;
          const atual = !cancelado && i === atualIdx;
          const data = dataPorStatus.get(etapa);
          return (
            <li key={etapa} className="flex-1 flex flex-col items-center text-center">
              <div className="flex w-full items-center">
                {/* conector esquerdo */}
                <span
                  className={cn(
                    "h-0.5 flex-1",
                    i === 0 ? "opacity-0" : concluida || atual ? "bg-primary" : "bg-border",
                  )}
                />
                <span
                  className={cn(
                    "grid place-items-center rounded-full border-2 shrink-0 transition-colors",
                    dot,
                    concluida
                      ? "border-primary bg-primary text-primary-foreground"
                      : atual
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground",
                  )}
                >
                  {concluida ? (
                    <Check className={icon} />
                  ) : (
                    <span className={cn("rounded-full", atual ? "bg-primary" : "bg-muted-foreground/40", size === "sm" ? "size-1.5" : "size-2")} />
                  )}
                </span>
                {/* conector direito */}
                <span
                  className={cn(
                    "h-0.5 flex-1",
                    i === COMPRA_STATUS_ORDER.length - 1
                      ? "opacity-0"
                      : concluida
                        ? "bg-primary"
                        : "bg-border",
                  )}
                />
              </div>
              <div
                className={cn(
                  "mt-1.5 font-semibold leading-tight",
                  size === "sm" ? "text-[10px]" : "text-xs",
                  atual ? "text-primary" : concluida ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {COMPRA_STATUS_LABEL[etapa]}
              </div>
              {data && size !== "sm" ? (
                <div className="text-[10px] text-muted-foreground tabular-nums">
                  {formatDateBR(data)}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
