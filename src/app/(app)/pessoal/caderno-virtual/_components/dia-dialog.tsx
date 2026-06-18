"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { deleteOcorrencia } from "@/lib/actions/colaboradores";
import {
  OCORRENCIA_TIPO_LABEL,
  OCORRENCIA_TIPO_TONE,
} from "@/lib/mocks/colaboradores";
import type { OcorrenciaCaderno } from "@/lib/actions/caderno-virtual";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataIso: string | null;
  ocorrencias: OcorrenciaCaderno[];
  onNovoRegistro: () => void;
};

function formatarData(dataIso: string) {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function DiaDialog({
  open,
  onOpenChange,
  dataIso,
  ocorrencias,
  onNovoRegistro,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string, colaboradorId: string) {
    if (!confirm("Excluir esta ocorrência?")) return;
    startTransition(async () => {
      const res = await deleteOcorrencia(id, colaboradorId);
      if (!res.ok) {
        toast.error("Erro ao excluir", { description: res.error });
        return;
      }
      toast.success("Ocorrência excluída");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {dataIso ? formatarData(dataIso) : "Ocorrências"}
          </DialogTitle>
          <DialogDescription>
            {ocorrencias.length} {ocorrencias.length === 1 ? "ocorrência" : "ocorrências"}{" "}
            neste dia.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-2 -mx-1 px-1">
          {ocorrencias.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma ocorrência registrada.
            </div>
          ) : (
            ocorrencias.map((o) => {
              const tone = OCORRENCIA_TIPO_TONE[o.tipo];
              return (
                <div
                  key={o.id}
                  className="rounded-md border bg-background p-3 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={cn("text-xs", tone.bg, tone.text)}
                        >
                          {OCORRENCIA_TIPO_LABEL[o.tipo]}
                        </Badge>
                        <span className="text-sm font-semibold">
                          {o.colaborador_nome}
                        </span>
                        {o.colaborador_matricula && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Mat. {o.colaborador_matricula}
                          </span>
                        )}
                      </div>
                      {o.colaborador_cargo && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {o.colaborador_cargo}
                          {o.colaborador_setor ? ` · ${o.colaborador_setor}` : ""}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(o.id, o.colaborador_id)}
                      disabled={isPending}
                      aria-label="Excluir"
                    >
                      {isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm">{o.descricao}</p>
                  {o.observacoes && (
                    <p className="text-xs text-muted-foreground border-l-2 border-muted pl-2">
                      {o.observacoes}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          <Button type="button" onClick={onNovoRegistro} className="gap-2">
            <Plus className="size-4" />
            Novo registro neste dia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
