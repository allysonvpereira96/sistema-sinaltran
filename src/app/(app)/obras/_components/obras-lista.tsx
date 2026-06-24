"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Building2,
  CheckCircle2,
  Clock,
  HardHat,
  Eye,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  OBRA_STATUS_LABEL,
  OBRA_STATUS_TONE,
  calcularSaldo,
  type ObraListRow,
} from "@/lib/types/obra";
import { deleteObra } from "@/lib/actions/obras";
import { formatBRL, formatDateBR, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";

type FiltroRapido = "todas" | "em_andamento" | "com_saldo" | "concluidas" | "atraso";

const FILTROS_RAPIDOS: { value: FiltroRapido; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "com_saldo", label: "Com saldo a medir" },
  { value: "concluidas", label: "Concluídas" },
  { value: "atraso", label: "Em atraso" },
];

const hoje = new Date().toISOString().slice(0, 10);

function isAtrasada(obra: ObraListRow) {
  if (obra.status === "concluida" || obra.status === "cancelada") return false;
  if (!obra.data_fim_prevista) return false;
  return obra.data_fim_prevista < hoje;
}

const clienteNome = (o: ObraListRow) =>
  o.cliente?.nome_fantasia ?? o.cliente?.razao_social ?? "—";

export function ObrasLista({
  obras,
  empresaNome,
}: {
  obras: ObraListRow[];
  empresaNome?: string | null;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroRapido>("todas");
  const [clienteId, setClienteId] = useState<string>("todos");

  const clientesFiltro = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of obras) {
      if (o.cliente_id && !map.has(o.cliente_id)) map.set(o.cliente_id, clienteNome(o));
    }
    return [...map.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [obras]);

  const filtradas = useMemo(() => {
    const q = normalizeSearch(busca);
    return obras.filter((obra) => {
      if (
        q &&
        !normalizeSearch(obra.nome).includes(q) &&
        !normalizeSearch(obra.numero).includes(q) &&
        !normalizeSearch(obra.responsavel ?? "").includes(q) &&
        !normalizeSearch(clienteNome(obra)).includes(q)
      ) {
        return false;
      }
      if (clienteId !== "todos" && obra.cliente_id !== clienteId) return false;
      if (filtro === "em_andamento" && obra.status !== "em_andamento") return false;
      if (filtro === "concluidas" && obra.status !== "concluida") return false;
      if (filtro === "com_saldo") {
        const { saldo_restante } = calcularSaldo(obra.valor_total, obra.valor_medido);
        if (saldo_restante <= 0) return false;
      }
      if (filtro === "atraso" && !isAtrasada(obra)) return false;
      return true;
    });
  }, [busca, filtro, clienteId, obras]);

  const counts = useMemo(() => {
    const emAndamento = obras.filter((o) => o.status === "em_andamento").length;
    const concluidas = obras.filter((o) => o.status === "concluida").length;
    const comSaldo = obras.filter(
      (o) => calcularSaldo(o.valor_total, o.valor_medido).saldo_restante > 0,
    ).length;
    const emAtraso = obras.filter(isAtrasada).length;
    const valorContratado = obras.reduce((acc, o) => acc + o.valor_total, 0);
    const valorMedido = obras.reduce((acc, o) => acc + o.valor_medido, 0);
    return {
      total: obras.length,
      emAndamento,
      concluidas,
      comSaldo,
      emAtraso,
      valorContratado,
      valorMedido,
    };
  }, [obras]);

  async function handleDelete(obra: ObraListRow) {
    if (!confirm(`Excluir a obra "${obra.nome}" (${obra.numero})? Esta ação não pode ser desfeita.`))
      return;
    const res = await deleteObra(obra.id);
    if (res.ok) {
      toast.success("Obra excluída");
      router.refresh();
    } else {
      toast.error("Erro ao excluir", { description: res.error });
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
      <PageHeader
        title={empresaNome ? `Obras · ${empresaNome}` : "Obras"}
        description="Obras da empresa ativa: escopo, prazos, responsáveis, equipe e medições."
        actions={
          <Link
            href="/obras/nova"
            className={cn(buttonVariants({ size: "default" }), "gap-2")}
          >
            <Plus className="size-4" />
            Nova obra
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Obras ativas"
          value={String(counts.emAndamento)}
          detail={`${counts.total} obras cadastradas`}
          icon={HardHat}
          tone="ok"
        />
        <KpiCard
          label="Com saldo a medir"
          value={String(counts.comSaldo)}
          detail={formatBRL(counts.valorContratado - counts.valorMedido)}
          icon={Building2}
          tone="info"
        />
        <KpiCard
          label="Em atraso"
          value={String(counts.emAtraso)}
          detail="Prazo previsto vencido"
          icon={Clock}
          tone="alert"
        />
        <KpiCard
          label="Concluídas"
          value={String(counts.concluidas)}
          detail="No período"
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 h-10 w-full lg:w-96 rounded-md border bg-background px-3 text-sm">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, número, responsável ou cliente…"
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
              />
            </div>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="todos">Todos os clientes</option>
              {clientesFiltro.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTROS_RAPIDOS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFiltro(f.value)}
                aria-pressed={filtro === f.value}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  filtro === f.value
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted",
                )}
              >
                {f.label}
              </button>
            ))}
            <div className="ml-auto text-xs text-muted-foreground self-center">
              {filtradas.length} de {obras.length} obras
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obra</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="w-40">Progresso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-16 text-center text-sm text-muted-foreground">
                    {obras.length === 0
                      ? "Nenhuma obra ainda. Crie uma obra ou converta um orçamento aprovado."
                      : "Nenhuma obra encontrada com os filtros atuais."}
                  </TableCell>
                </TableRow>
              ) : (
                filtradas.map((obra) => {
                  const { saldo_restante, percentual_executado } = calcularSaldo(
                    obra.valor_total,
                    obra.valor_medido,
                  );
                  const statusTone = OBRA_STATUS_TONE[obra.status];
                  const atrasada = isAtrasada(obra);
                  return (
                    <TableRow key={obra.id}>
                      <TableCell>
                        <div className="font-semibold">{obra.nome}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {obra.numero}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{clienteNome(obra)}</div>
                        <div className="text-xs text-muted-foreground">
                          {obra.cidade ? `${obra.cidade}/${obra.estado ?? "—"}` : "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{obra.responsavel ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        <div className={cn(atrasada && "text-rose-600 font-semibold")}>
                          {formatDateBR(obra.data_fim_prevista)}
                        </div>
                        {obra.data_inicio ? (
                          <div className="text-muted-foreground">
                            início {formatDateBR(obra.data_inicio)}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {formatBRL(obra.valor_total)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="text-sm font-semibold">
                          {formatBRL(saldo_restante)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {(100 - percentual_executado).toFixed(1)}% restante
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={percentual_executado} className="h-1.5 flex-1" />
                          <span className="text-xs font-semibold w-10 text-right">
                            {percentual_executado.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("gap-1.5 font-medium", statusTone.bg, statusTone.text)}
                        >
                          <span className={cn("size-1.5 rounded-full", statusTone.dot)} />
                          {OBRA_STATUS_LABEL[obra.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => router.push(`/obras/${obra.id}`)}
                            aria-label="Ver detalhes"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => router.push(`/obras/${obra.id}/editar`)}
                            aria-label="Editar"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(obra)}
                            aria-label="Excluir"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

type Tone = "ok" | "info" | "alert" | "success";
const TONE_CLASSES: Record<Tone, { bg: string; text: string; dot: string }> = {
  ok: { bg: "bg-sky-50", text: "text-sky-600", dot: "bg-sky-500" },
  info: { bg: "bg-violet-50", text: "text-violet-600", dot: "bg-violet-500" },
  alert: { bg: "bg-rose-50", text: "text-rose-600", dot: "bg-rose-500" },
  success: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" },
};

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {label}
            </div>
            <div className="text-3xl font-bold mt-2">{value}</div>
          </div>
          <div className={cn("size-10 rounded-lg grid place-items-center", t.bg)}>
            <Icon className={cn("size-5", t.text)} />
          </div>
        </div>
        <div className={cn("text-xs mt-3 font-medium flex items-center gap-1", t.text)}>
          <span className={cn("size-1.5 rounded-full", t.dot)} />
          {detail}
        </div>
      </CardContent>
    </Card>
  );
}
