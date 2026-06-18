"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
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
import { createOcorrencia } from "@/lib/actions/colaboradores";
import {
  OCORRENCIA_TIPO_LABEL,
  type OcorrenciaTipo,
} from "@/lib/mocks/colaboradores";
import type { ColaboradorResumo } from "@/lib/actions/caderno-virtual";
import { cn } from "@/lib/utils";

const TIPOS = Object.entries(OCORRENCIA_TIPO_LABEL) as [OcorrenciaTipo, string][];

function hoje() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaboradores: ColaboradorResumo[];
  /** Data ISO pré-selecionada (ex.: ao clicar em um dia do calendário). */
  dataPre?: string | null;
};

export function NovoRegistroModal({
  open,
  onOpenChange,
  colaboradores,
  dataPre,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [colaboradorId, setColaboradorId] = useState("");
  const [busca, setBusca] = useState("");
  const [data, setData] = useState(dataPre ?? hoje());
  const [tipo, setTipo] = useState<OcorrenciaTipo>("observacao");
  const [descricao, setDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (!open) return;
    setColaboradorId("");
    setBusca("");
    setData(dataPre ?? hoje());
    setTipo("observacao");
    setDescricao("");
    setObservacoes("");
  }, [open, dataPre]);

  const buscaNorm = busca.trim().toLowerCase();
  const colaboradoresFiltrados = buscaNorm
    ? colaboradores.filter(
        (c) =>
          c.nome_completo.toLowerCase().includes(buscaNorm) ||
          (c.matricula ?? "").toLowerCase().includes(buscaNorm),
      )
    : colaboradores;

  const colaboradorSelecionado = colaboradores.find((c) => c.id === colaboradorId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!colaboradorId) {
      toast.error("Selecione um colaborador");
      return;
    }
    if (!descricao.trim()) {
      toast.error("Informe a descrição da ocorrência");
      return;
    }
    if (!data) {
      toast.error("Informe a data");
      return;
    }
    startTransition(async () => {
      const res = await createOcorrencia({
        colaborador_id: colaboradorId,
        tipo,
        descricao: descricao.trim(),
        data,
        observacoes: observacoes.trim() || null,
      });
      if (!res.ok) {
        toast.error("Erro ao registrar", { description: res.error });
        return;
      }
      toast.success("Ocorrência registrada");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo registro</DialogTitle>
          <DialogDescription>
            Lance uma ocorrência (falta, atestado, advertência, elogio…) no
            caderno virtual.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* === Colaborador (busca + lista) === */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Colaborador *
            </Label>
            {colaboradorSelecionado ? (
              <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                <div className="text-sm">
                  <div className="font-medium">{colaboradorSelecionado.nome_completo}</div>
                  <div className="text-xs text-muted-foreground">
                    {colaboradorSelecionado.matricula
                      ? `Mat. ${colaboradorSelecionado.matricula} · `
                      : ""}
                    {colaboradorSelecionado.cargo ?? "—"}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setColaboradorId("");
                    setBusca("");
                  }}
                >
                  Trocar
                </Button>
              </div>
            ) : (
              <>
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar colaborador por nome ou matrícula…"
                />
                <div className="max-h-40 overflow-y-auto rounded-md border bg-background">
                  {colaboradoresFiltrados.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                      Nenhum colaborador encontrado.
                    </div>
                  ) : (
                    <ul>
                      {colaboradoresFiltrados.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => setColaboradorId(c.id)}
                            className={cn(
                              "w-full text-left px-3 py-2 hover:bg-muted text-sm transition-colors",
                              colaboradorId === c.id && "bg-muted",
                            )}
                          >
                            <div className="font-medium">{c.nome_completo}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {c.matricula ? `Mat. ${c.matricula} · ` : ""}
                              {c.cargo ?? "—"}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>

          {/* === Data + Tipo === */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                Data *
              </Label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                Tipo *
              </Label>
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

          {/* === Descrição === */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Descrição *
            </Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Descreva a ocorrência…"
              required
            />
          </div>

          {/* === Observações === */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Observações
            </Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Observações adicionais (opcional)…"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
