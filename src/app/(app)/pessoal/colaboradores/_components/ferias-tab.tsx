"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Plane,
  Trash2,
  AlertTriangle,
  Calendar,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FERIAS_STATUS_LABEL,
  type ColaboradorFerias,
} from "@/lib/mocks/colaboradores";
import type { ColaboradorPeriodoAquisitivo } from "@/lib/types/rh";
import { calcularPrazoInicioGozo } from "@/lib/types/rh";
import {
  createFerias,
  updateFerias,
  deleteFerias,
  upsertPeriodoAquisitivo,
  deletePeriodoAquisitivo,
} from "@/lib/actions/colaboradores";
import { formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";

type FeriasStatus = ColaboradorFerias["status"];
const STATUS_VALUES: FeriasStatus[] = ["agendada", "em_gozo", "concluida"];

function diasEntre(inicio: string, fim: string): number {
  if (!inicio || !fim) return 0;
  const ms = new Date(fim).getTime() - new Date(inicio).getTime();
  return ms >= 0 ? Math.round(ms / 86_400_000) + 1 : 0;
}

function diasAteHoje(prazoIso: string): number {
  // Comparação em UTC para evitar deslocamento de fuso
  const hoje = new Date();
  const [y, m, d] = prazoIso.split("-").map(Number);
  const prazo = new Date(Date.UTC(y, m - 1, d));
  const hojeUtc = new Date(
    Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()),
  );
  return Math.round((prazo.getTime() - hojeUtc.getTime()) / 86_400_000);
}

const FORM_INICIAL = {
  id: "",
  periodo_aquisitivo_inicio: "",
  periodo_aquisitivo_fim: "",
  data_inicio: "",
  data_fim: "",
  status: "agendada" as FeriasStatus,
};

/** Cor de cada status para o select inline. */
const STATUS_TONE: Record<FeriasStatus, string> = {
  agendada: "bg-amber-50 text-amber-700 border-amber-200",
  em_gozo: "bg-sky-50 text-sky-700 border-sky-200",
  concluida: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const FORM_AQ_INICIAL = {
  id: "",
  aquisitivo_inicio: "",
  aquisitivo_fim: "",
  dias_direito: "30",
  concessivo_inicio: "",
  concessivo_fim: "",
  prazo_dobro: "",
};

export function FeriasTab({
  colaboradorId,
  ferias,
  periodos = [],
  readOnly = false,
}: {
  colaboradorId: string;
  ferias: ColaboradorFerias[];
  periodos?: ColaboradorPeriodoAquisitivo[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [aqOpen, setAqOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(FORM_INICIAL);
  const [formAq, setFormAq] = useState(FORM_AQ_INICIAL);

  const dias = diasEntre(form.data_inicio, form.data_fim);

  function abrirNovoGozo() {
    setForm(FORM_INICIAL);
    setOpen(true);
  }

  function abrirEditarGozo(f: ColaboradorFerias) {
    setForm({
      id: f.id,
      periodo_aquisitivo_inicio: f.periodo_aquisitivo_inicio ?? "",
      periodo_aquisitivo_fim: f.periodo_aquisitivo_fim ?? "",
      data_inicio: f.data_inicio,
      data_fim: f.data_fim,
      status: f.status,
    });
    setOpen(true);
  }

  async function handleAdd() {
    if (!form.data_inicio || !form.data_fim) {
      toast.error("Informe as datas de início e fim.");
      return;
    }
    if (dias <= 0) {
      toast.error("A data de fim deve ser posterior à de início.");
      return;
    }
    setSaving(true);
    const res = form.id
      ? await updateFerias(
          form.id,
          {
            periodo_aquisitivo_inicio: form.periodo_aquisitivo_inicio || null,
            periodo_aquisitivo_fim: form.periodo_aquisitivo_fim || null,
            data_inicio: form.data_inicio,
            data_fim: form.data_fim,
            dias,
            status: form.status,
          },
          colaboradorId,
        )
      : await createFerias({
          colaborador_id: colaboradorId,
          periodo_aquisitivo_inicio: form.periodo_aquisitivo_inicio || null,
          periodo_aquisitivo_fim: form.periodo_aquisitivo_fim || null,
          data_inicio: form.data_inicio,
          data_fim: form.data_fim,
          status: form.status,
          dias,
        });
    setSaving(false);
    if (res.ok) {
      toast.success(form.id ? "Gozo atualizado" : "Gozo de férias registrado");
      setForm(FORM_INICIAL);
      setOpen(false);
      router.refresh();
    } else {
      toast.error("Erro ao salvar", { description: res.error });
    }
  }

  function handleStatusChange(f: ColaboradorFerias, novoStatus: FeriasStatus) {
    if (novoStatus === f.status) return;
    startTransition(async () => {
      const res = await updateFerias(f.id, { status: novoStatus }, colaboradorId);
      if (res.ok) {
        toast.success(`Status alterado para "${FERIAS_STATUS_LABEL[novoStatus]}"`);
        router.refresh();
      } else {
        toast.error("Erro ao alterar status", { description: res.error });
      }
    });
  }

  function handleDelete(f: ColaboradorFerias) {
    if (!confirm("Remover este período de gozo?")) return;
    startTransition(async () => {
      const res = await deleteFerias(f.id, colaboradorId);
      if (res.ok) {
        toast.success("Gozo removido");
        router.refresh();
      } else {
        toast.error("Erro ao remover", { description: res.error });
      }
    });
  }

  function abrirNovoAq() {
    setFormAq(FORM_AQ_INICIAL);
    setAqOpen(true);
  }

  function abrirEditarAq(p: ColaboradorPeriodoAquisitivo) {
    setFormAq({
      id: p.id,
      aquisitivo_inicio: p.aquisitivo_inicio,
      aquisitivo_fim: p.aquisitivo_fim,
      dias_direito: String(p.dias_direito),
      concessivo_inicio: p.concessivo_inicio ?? "",
      concessivo_fim: p.concessivo_fim ?? "",
      prazo_dobro: p.prazo_dobro ?? "",
    });
    setAqOpen(true);
  }

  async function handleSalvarAq() {
    if (!formAq.aquisitivo_inicio || !formAq.aquisitivo_fim) {
      toast.error("Informe o período aquisitivo.");
      return;
    }
    setSaving(true);
    const res = await upsertPeriodoAquisitivo({
      id: formAq.id || undefined,
      colaborador_id: colaboradorId,
      aquisitivo_inicio: formAq.aquisitivo_inicio,
      aquisitivo_fim: formAq.aquisitivo_fim,
      dias_direito: Number(formAq.dias_direito) || 0,
      concessivo_inicio: formAq.concessivo_inicio || null,
      concessivo_fim: formAq.concessivo_fim || null,
      prazo_dobro: formAq.prazo_dobro || null,
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Período aquisitivo salvo");
      setAqOpen(false);
      router.refresh();
    } else {
      toast.error("Erro ao salvar", { description: res.error });
    }
  }

  function handleDeleteAq(p: ColaboradorPeriodoAquisitivo) {
    if (
      !confirm(
        `Remover o período aquisitivo ${formatDateBR(p.aquisitivo_inicio)} → ${formatDateBR(p.aquisitivo_fim)}?`,
      )
    )
      return;
    startTransition(async () => {
      const res = await deletePeriodoAquisitivo(p.id, colaboradorId);
      if (res.ok) {
        toast.success("Período aquisitivo removido");
        router.refresh();
      } else {
        toast.error("Erro ao remover", { description: res.error });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ============================================================
       * Periodos aquisitivos — saldo de direito por período (do PDF da
       * contabilidade). Mostrado primeiro porque é o que dirige a
       * decisão de quando agendar as férias.
       * ============================================================ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">
              Períodos aquisitivos
            </h3>
            <p className="text-xs text-muted-foreground">
              Saldo de dias de direito (do relatório da contabilidade).
            </p>
          </div>
          {!readOnly && (
            <Button size="sm" variant="outline" className="gap-2" onClick={abrirNovoAq}>
              <Plus className="size-4" />
              Adicionar período
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {periodos.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Calendar className="size-7 opacity-40" />
                <p className="text-sm">Nenhum período aquisitivo cadastrado.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período aquisitivo</TableHead>
                    <TableHead>Período concessivo</TableHead>
                    <TableHead className="text-right">Dias</TableHead>
                    <TableHead>Último dia p/ iniciar gozo</TableHead>
                    {!readOnly && <TableHead className="w-24 text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodos.map((p) => {
                    // Usa o prazo do PDF da contabilidade; se não tem, calcula
                    const prazoInicio = calcularPrazoInicioGozo(
                      p.concessivo_fim,
                      p.dias_direito,
                      p.prazo_dobro,
                    );
                    const oficial = !!p.prazo_dobro;
                    const diasRest = prazoInicio
                      ? diasAteHoje(prazoInicio)
                      : null;
                    const tone =
                      diasRest == null
                        ? null
                        : diasRest < 0
                          ? "vencido"
                          : diasRest <= 30
                            ? "urgente"
                            : diasRest <= 90
                              ? "atencao"
                              : "ok";
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm font-mono">
                          {formatDateBR(p.aquisitivo_inicio)} →{" "}
                          {formatDateBR(p.aquisitivo_fim)}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {p.concessivo_inicio && p.concessivo_fim
                            ? `${formatDateBR(p.concessivo_inicio)} → ${formatDateBR(p.concessivo_fim)}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-semibold">
                          {Number(p.dias_direito).toLocaleString("pt-BR", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          {prazoInicio ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "gap-1.5 font-medium",
                                  tone === "vencido" &&
                                    "bg-rose-50 text-rose-700",
                                  tone === "urgente" &&
                                    "bg-rose-50 text-rose-700",
                                  tone === "atencao" &&
                                    "bg-amber-50 text-amber-700",
                                  tone === "ok" &&
                                    "bg-emerald-50 text-emerald-700",
                                )}
                              >
                                {tone === "vencido" || tone === "urgente" ? (
                                  <AlertTriangle className="size-3" />
                                ) : null}
                                {formatDateBR(prazoInicio)}
                              </Badge>
                              {diasRest != null && (
                                <span className="text-xs text-muted-foreground">
                                  {diasRest < 0
                                    ? `${Math.abs(diasRest)}d atrasado`
                                    : `em ${diasRest}d`}
                                </span>
                              )}
                              {!oficial && (
                                <span
                                  className="text-[10px] uppercase tracking-wider text-muted-foreground"
                                  title="Data calculada pelo sistema: concessivo - dias de direito + 1"
                                >
                                  calculado
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {!readOnly && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => abrirEditarAq(p)}
                                aria-label="Editar"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={isPending}
                                onClick={() => handleDeleteAq(p)}
                                aria-label="Remover"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ============================================================
       * Gozos efetivos — períodos agendados/concluídos
       * ============================================================ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">
              Gozos de férias
            </h3>
            <p className="text-xs text-muted-foreground">
              Períodos efetivos de fruição (agendados ou já concluídos).
            </p>
          </div>
          {!readOnly && (
            <Button className="gap-2" size="sm" onClick={abrirNovoGozo}>
              <Plus className="size-4" />
              Registrar gozo
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {ferias.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Plane className="size-7 opacity-40" />
                <p className="text-sm">Nenhum gozo registrado.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período aquisitivo</TableHead>
                    <TableHead>Gozo</TableHead>
                    <TableHead className="text-right">Dias</TableHead>
                    <TableHead>Status</TableHead>
                    {!readOnly && (
                      <TableHead className="w-24 text-right">Ações</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ferias.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-sm">
                        {formatDateBR(f.periodo_aquisitivo_inicio)} →{" "}
                        {formatDateBR(f.periodo_aquisitivo_fim)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateBR(f.data_inicio)} →{" "}
                        {formatDateBR(f.data_fim)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {f.dias}
                      </TableCell>
                      <TableCell>
                        {readOnly ? (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "font-medium border",
                              STATUS_TONE[f.status],
                            )}
                          >
                            {FERIAS_STATUS_LABEL[f.status]}
                          </Badge>
                        ) : (
                          <select
                            value={f.status}
                            disabled={isPending}
                            onChange={(e) =>
                              handleStatusChange(f, e.target.value as FeriasStatus)
                            }
                            className={cn(
                              "h-7 rounded-md border px-2 text-xs font-medium cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                              STATUS_TONE[f.status],
                            )}
                            aria-label="Status do gozo"
                          >
                            {STATUS_VALUES.map((s) => (
                              <option key={s} value={s}>
                                {FERIAS_STATUS_LABEL[s]}
                              </option>
                            ))}
                          </select>
                        )}
                      </TableCell>
                      {!readOnly && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => abrirEditarGozo(f)}
                              aria-label="Editar"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={isPending}
                              onClick={() => handleDelete(f)}
                              aria-label="Remover"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* === Modal: Gozo (criação ou edição) === */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Editar gozo de férias" : "Registrar gozo de férias"}
            </DialogTitle>
            <DialogDescription>
              Registre as datas efetivas de fruição e o período aquisitivo
              correspondente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  Aquisitivo (início)
                </Label>
                <Input
                  type="date"
                  value={form.periodo_aquisitivo_inicio}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      periodo_aquisitivo_inicio: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  Aquisitivo (fim)
                </Label>
                <Input
                  type="date"
                  value={form.periodo_aquisitivo_fim}
                  onChange={(e) =>
                    setForm({ ...form, periodo_aquisitivo_fim: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  Gozo (início) *
                </Label>
                <Input
                  type="date"
                  value={form.data_inicio}
                  onChange={(e) =>
                    setForm({ ...form, data_inicio: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  Gozo (fim) *
                </Label>
                <Input
                  type="date"
                  value={form.data_fim}
                  onChange={(e) =>
                    setForm({ ...form, data_fim: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  Dias
                </Label>
                <Input value={dias || ""} readOnly disabled placeholder="Calculado" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  Status
                </Label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as FeriasStatus })
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {STATUS_VALUES.map((s) => (
                    <option key={s} value={s}>
                      {FERIAS_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={handleAdd}>
              {saving ? "Salvando…" : form.id ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Modal: Período aquisitivo === */}
      <Dialog open={aqOpen} onOpenChange={setAqOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formAq.id ? "Editar período aquisitivo" : "Adicionar período aquisitivo"}
            </DialogTitle>
            <DialogDescription>
              Espelha os dados do relatório da contabilidade.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  Aquisitivo (início) *
                </Label>
                <Input
                  type="date"
                  value={formAq.aquisitivo_inicio}
                  onChange={(e) =>
                    setFormAq({ ...formAq, aquisitivo_inicio: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  Aquisitivo (fim) *
                </Label>
                <Input
                  type="date"
                  value={formAq.aquisitivo_fim}
                  onChange={(e) =>
                    setFormAq({ ...formAq, aquisitivo_fim: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  Dias de direito
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="30"
                  value={formAq.dias_direito}
                  onChange={(e) =>
                    setFormAq({ ...formAq, dias_direito: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  Prazo p/ dobra
                </Label>
                <Input
                  type="date"
                  value={formAq.prazo_dobro}
                  onChange={(e) =>
                    setFormAq({ ...formAq, prazo_dobro: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  Concessivo (início)
                </Label>
                <Input
                  type="date"
                  value={formAq.concessivo_inicio}
                  onChange={(e) =>
                    setFormAq({ ...formAq, concessivo_inicio: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  Concessivo (fim)
                </Label>
                <Input
                  type="date"
                  value={formAq.concessivo_fim}
                  onChange={(e) =>
                    setFormAq({ ...formAq, concessivo_fim: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAqOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={handleSalvarAq}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
