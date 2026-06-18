"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Paperclip, X } from "lucide-react";
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
import { createOcorrenciaCaderno } from "@/lib/actions/caderno-virtual";
import {
  OCORRENCIA_TIPO_LABEL,
  tipoTemPeriodo,
  tipoRecomendaAnexo,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [colaboradorId, setColaboradorId] = useState("");
  const [busca, setBusca] = useState("");
  const [data, setData] = useState(dataPre ?? hoje());
  const [tipo, setTipo] = useState<OcorrenciaTipo>("observacao");
  const [dias, setDias] = useState<string>("1");
  const [descricao, setDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [anexo, setAnexo] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setColaboradorId("");
    setBusca("");
    setData(dataPre ?? hoje());
    setTipo("observacao");
    setDias("1");
    setDescricao("");
    setObservacoes("");
    setAnexo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
  const temPeriodo = tipoTemPeriodo(tipo);
  const recomendaAnexo = tipoRecomendaAnexo(tipo);

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
    if (temPeriodo) {
      const n = Number(dias);
      if (!Number.isFinite(n) || n < 1) {
        toast.error("Informe os dias de afastamento (mínimo 1)");
        return;
      }
    }

    const fd = new FormData();
    fd.append("colaborador_id", colaboradorId);
    fd.append("tipo", tipo);
    fd.append("descricao", descricao.trim());
    fd.append("observacoes", observacoes.trim());
    fd.append("data", data);
    if (temPeriodo) fd.append("dias_atestado", String(Math.floor(Number(dias))));
    if (anexo) fd.append("anexo", anexo);

    startTransition(async () => {
      const res = await createOcorrenciaCaderno(fd);
      if (!res.ok) {
        toast.error("Erro ao registrar", { description: res.error });
        return;
      }
      toast.success("Ocorrência registrada", {
        description: anexo ? `Anexo "${anexo.name}" salvo.` : undefined,
      });
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                {temPeriodo ? "Data inicial *" : "Data *"}
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

          {/* === Dias (somente atestado/suspensão) === */}
          {temPeriodo && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                Dias de afastamento *
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={dias}
                  onChange={(e) => setDias(e.target.value)}
                  className="w-32"
                  required
                />
                <span className="text-xs text-muted-foreground">
                  {Number(dias) > 1
                    ? `Período: ${formatarPeriodoPreview(data, Number(dias))}`
                    : "Apenas o dia da data"}
                </span>
              </div>
            </div>
          )}

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

          {/* === Anexo === */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              Anexo {recomendaAnexo && <span className="text-amber-600">(recomendado)</span>}
            </Label>
            {anexo ? (
              <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                  <div className="truncate">
                    <span className="font-medium">{anexo.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {(anexo.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setAnexo(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  aria-label="Remover anexo"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setAnexo(f);
                  }}
                  accept=".pdf,image/png,image/jpeg,image/webp,.doc,.docx"
                  className="text-xs file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-muted/80 cursor-pointer block w-full text-muted-foreground"
                />
                {recomendaAnexo && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {tipo === "atestado" &&
                      "Anexe o atestado médico (PDF ou foto)."}
                    {tipo === "advertencia" &&
                      "Anexe o termo de advertência assinado."}
                    {tipo === "suspensao" &&
                      "Anexe o termo de suspensão assinado."}
                  </p>
                )}
              </div>
            )}
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

function formatarPeriodoPreview(dataIso: string, dias: number) {
  if (!dataIso || dias < 1) return "";
  const [y, m, d] = dataIso.split("-").map(Number);
  const inicio = new Date(Date.UTC(y, m - 1, d));
  const fim = new Date(Date.UTC(y, m - 1, d + dias - 1));
  const fmt = (dt: Date) =>
    `${String(dt.getUTCDate()).padStart(2, "0")}/${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${fmt(inicio)} a ${fmt(fim)} (${dias} dias)`;
}
