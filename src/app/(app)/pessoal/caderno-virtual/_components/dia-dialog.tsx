"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Paperclip, Download, Pencil } from "lucide-react";
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
import {
  deleteOcorrenciaCaderno,
  getAnexoOcorrenciaUrl,
} from "@/lib/actions/caderno-virtual";
import {
  OCORRENCIA_TIPO_LABEL,
  OCORRENCIA_TIPO_TONE,
  formatHorasMinutos,
} from "@/lib/mocks/colaboradores";
import type { OcorrenciaCaderno } from "@/lib/actions/caderno-virtual";
import { EditarOcorrenciaModal } from "./editar-ocorrencia-modal";
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

function formatarPeriodo(inicio: string, fim: string) {
  const fmt = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
  };
  return `${fmt(inicio)} a ${fmt(fim)}`;
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
  const [editando, setEditando] = useState<OcorrenciaCaderno | null>(null);

  function handleDelete(id: string, anexoUrl: string | null) {
    if (!confirm("Excluir esta ocorrência?")) return;
    startTransition(async () => {
      const res = await deleteOcorrenciaCaderno(id, anexoUrl);
      if (!res.ok) {
        toast.error("Erro ao excluir", { description: res.error });
        return;
      }
      toast.success("Ocorrência excluída");
      router.refresh();
    });
  }

  async function handleDownload(anexoUrl: string, anexoNome: string | null) {
    const url = await getAnexoOcorrenciaUrl(anexoUrl);
    if (!url) {
      toast.error("Não foi possível gerar o link do anexo");
      return;
    }
    // Abre em nova aba — pra PDF e imagens visualiza; pra outros baixa
    window.open(url, "_blank", "noopener,noreferrer");
    if (anexoNome) {
      // hint visual
      toast.success(`Abrindo "${anexoNome}"`);
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {dataIso ? formatarData(dataIso) : "Ocorrências"}
          </DialogTitle>
          <DialogDescription>
            {ocorrencias.length} {ocorrencias.length === 1 ? "ocorrência" : "ocorrências"}{" "}
            neste dia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 -mx-1 px-1">
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
                          {o.dias_atestado && o.dias_atestado > 1
                            ? ` · ${o.dias_atestado} dias`
                            : ""}
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
                      {o.dias_atestado &&
                      o.dias_atestado > 1 &&
                      o.data_fim ? (
                        <div className="text-[11px] text-foreground/70 mt-0.5 font-mono">
                          {o.tipo === "viagem" ? "Viagem" : "Afastamento"}:{" "}
                          {formatarPeriodo(o.data, o.data_fim)}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditando(o)}
                        disabled={isPending}
                        aria-label="Editar"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(o.id, o.anexo_url)}
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
                  </div>
                  {o.tipo === "banco_horas" && o.horas_minutos != null ? (
                    <span
                      className={cn(
                        "inline-block text-sm font-bold tabular-nums",
                        o.horas_minutos < 0 ? "text-rose-600" : "text-emerald-600",
                      )}
                    >
                      {formatHorasMinutos(o.horas_minutos)}
                    </span>
                  ) : null}
                  <p className="text-sm">{o.descricao}</p>
                  {o.observacoes && (
                    <p className="text-xs text-muted-foreground border-l-2 border-muted pl-2">
                      {o.observacoes}
                    </p>
                  )}
                  {o.anexo_url && (
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 h-8 text-xs"
                        onClick={() => handleDownload(o.anexo_url!, o.anexo_nome)}
                      >
                        <Paperclip className="size-3" />
                        {o.anexo_nome ?? "anexo"}
                        <Download className="size-3 text-muted-foreground" />
                      </Button>
                    </div>
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

      <EditarOcorrenciaModal
        key={editando?.id ?? "none"}
        open={editando !== null}
        onOpenChange={(o) => { if (!o) setEditando(null); }}
        ocorrencia={editando}
      />
    </>
  );
}
