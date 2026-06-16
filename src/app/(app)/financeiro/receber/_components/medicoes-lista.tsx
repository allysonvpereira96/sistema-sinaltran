"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Wallet,
  CheckCircle2,
  Clock,
  Search,
  Eye,
  Pencil,
  Trash2,
  Send,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MEDICAO_STATUS_LABEL,
  MEDICAO_STATUS_TONE,
  type MedicaoListRow,
  type MedicaoStatus,
} from "@/lib/types/medicao";
import { deleteMedicao, marcarRecebida } from "@/lib/actions/medicoes";
import { formatBRL, formatDateBR, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";

type FiltroRapido = "todas" | MedicaoStatus | "a_receber" | "recebidas";

const FILTROS_RAPIDOS: { value: FiltroRapido; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "rascunho", label: "Rascunhos" },
  { value: "enviada", label: "Enviadas" },
  { value: "aprovada", label: "Aprovadas" },
  { value: "a_receber", label: "A receber" },
  { value: "recebidas", label: "Recebidas" },
];

const hoje = new Date().toISOString().slice(0, 10);
const clienteNome = (m: MedicaoListRow) =>
  m.obra?.cliente?.nome_fantasia ?? m.obra?.cliente?.razao_social ?? "";

export function MedicoesLista({ medicoes }: { medicoes: MedicaoListRow[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroRapido>("todas");
  const [obraId, setObraId] = useState<string>("todas");

  const obrasFiltro = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of medicoes) {
      if (m.obra_id && m.obra && !map.has(m.obra_id)) {
        map.set(m.obra_id, `${m.obra.numero} — ${m.obra.nome}`);
      }
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [medicoes]);

  const aReceber = (m: MedicaoListRow) =>
    m.status === "aprovada" && !m.data_recebimento;

  const filtradas = useMemo(() => {
    const q = normalizeSearch(busca);
    return medicoes.filter((m) => {
      if (q) {
        const hay = [
          m.obra?.nome,
          m.obra?.numero,
          clienteNome(m),
          m.observacoes ?? "",
          `medicao ${m.numero}`,
        ]
          .filter(Boolean)
          .map((s) => normalizeSearch(s as string))
          .join(" ");
        if (!hay.includes(q)) return false;
      }
      if (obraId !== "todas" && m.obra_id !== obraId) return false;
      if (filtro === "a_receber") return aReceber(m);
      if (filtro === "recebidas") return !!m.data_recebimento;
      if (filtro !== "todas" && m.status !== filtro) return false;
      return true;
    });
  }, [medicoes, busca, filtro, obraId]);

  const counts = useMemo(() => {
    const enviadas = medicoes.filter((m) => m.status === "enviada");
    const aprovadas = medicoes.filter((m) => m.status === "aprovada");
    const totalEnviado = enviadas.reduce((a, m) => a + m.valor_total, 0);
    const totalAprovado = aprovadas.reduce((a, m) => a + m.valor_total, 0);
    const aReceberList = medicoes.filter(aReceber);
    const totalAReceber = aReceberList.reduce((a, m) => a + m.valor_total, 0);
    const recebidas = medicoes.filter((m) => m.data_recebimento);
    const totalRecebido = recebidas.reduce((a, m) => a + m.valor_total, 0);
    return {
      enviadas: enviadas.length,
      aprovadas: aprovadas.length,
      totalEnviado,
      totalAprovado,
      aReceber: aReceberList.length,
      totalAReceber,
      recebidas: recebidas.length,
      totalRecebido,
    };
  }, [medicoes]);

  async function handleDelete(m: MedicaoListRow) {
    if (!confirm(`Excluir a medição nº ${m.numero} de "${m.obra?.nome ?? "—"}"?`)) return;
    const res = await deleteMedicao(m.id);
    if (res.ok) {
      toast.success("Medição excluída");
      router.refresh();
    } else {
      toast.error("Erro ao excluir", { description: res.error });
    }
  }

  async function handleReceber(m: MedicaoListRow) {
    const res = await marcarRecebida(m.id, !m.data_recebimento);
    if (res.ok) {
      toast.success(m.data_recebimento ? "Baixa desfeita" : "Recebimento registrado");
      router.refresh();
    } else {
      toast.error("Erro", { description: res.error });
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
      <PageHeader
        title="Medições / Contas a receber"
        description="Boletins de medição por obra. Cada medição aprovada vira uma conta a receber do cliente."
        actions={
          <Link
            href="/financeiro/receber/nova"
            className={cn(buttonVariants({ size: "default" }), "gap-2")}
          >
            <Plus className="size-4" />
            Nova medição
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Aguardando aprovação"
          value={String(counts.enviadas)}
          detail={formatBRL(counts.totalEnviado)}
          icon={Send}
          tone="info"
        />
        <KpiCard
          label="A receber"
          value={String(counts.aReceber)}
          detail={formatBRL(counts.totalAReceber)}
          icon={Clock}
          tone="ok"
        />
        <KpiCard
          label="Recebido"
          value={String(counts.recebidas)}
          detail={formatBRL(counts.totalRecebido)}
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          label="Total no período"
          value={String(medicoes.length)}
          detail="Medições cadastradas"
          icon={Wallet}
          tone="neutral"
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
                placeholder="Buscar por obra, cliente ou número…"
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
              />
            </div>
            <select
              value={obraId}
              onChange={(e) => setObraId(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm max-w-[320px]"
            >
              <option value="todas">Todas as obras</option>
              {obrasFiltro.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label.slice(0, 48)}
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
              {filtradas.length} de {medicoes.length} medições
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obra / Cliente</TableHead>
                <TableHead>Medição</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">% Exec.</TableHead>
                <TableHead>Prev. receb.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-40 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">
                    {medicoes.length === 0
                      ? "Nenhuma medição ainda. Crie uma medição vinculada a uma obra."
                      : "Nenhuma medição encontrada com os filtros atuais."}
                  </TableCell>
                </TableRow>
              ) : (
                filtradas.map((m) => {
                  const tone = MEDICAO_STATUS_TONE[m.status];
                  const recebida = !!m.data_recebimento;
                  const atrasada =
                    aReceber(m) &&
                    m.data_previsao_recebimento &&
                    m.data_previsao_recebimento < hoje;
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-semibold truncate max-w-[300px]" title={m.obra?.nome}>
                          {m.obra?.nome ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-mono">{m.obra?.numero}</span>
                          {clienteNome(m) ? ` · ${clienteNome(m)}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        nº {String(m.numero).padStart(2, "0")}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{formatDateBR(m.data_inicio)}</div>
                        <div className="text-muted-foreground">até {formatDateBR(m.data_fim)}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formatBRL(m.valor_total)}
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">
                        {m.percentual_executado.toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {recebida ? (
                          <span className="text-emerald-600">
                            recebido {formatDateBR(m.data_recebimento)}
                          </span>
                        ) : (
                          <span className={cn(atrasada && "text-rose-600 font-semibold")}>
                            {formatDateBR(m.data_previsao_recebimento) || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("gap-1.5 font-medium", tone.bg, tone.text)}
                        >
                          <span className={cn("size-1.5 rounded-full", tone.dot)} />
                          {MEDICAO_STATUS_LABEL[m.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          {m.status === "aprovada" ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleReceber(m)}
                              aria-label={recebida ? "Desfazer baixa" : "Marcar recebida"}
                              title={recebida ? "Desfazer baixa" : "Marcar como recebida"}
                            >
                              <BadgeCheck
                                className={cn(
                                  "size-3.5",
                                  recebida ? "text-emerald-600" : "text-muted-foreground",
                                )}
                              />
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => router.push(`/financeiro/receber/${m.id}`)}
                            aria-label="Ver detalhes"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => router.push(`/financeiro/receber/${m.id}/editar`)}
                            aria-label="Editar"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(m)}
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

type Tone = "ok" | "info" | "success" | "neutral";
const TONE_CLASSES: Record<Tone, { bg: string; text: string; dot: string }> = {
  ok: { bg: "bg-sky-50", text: "text-sky-600", dot: "bg-sky-500" },
  info: { bg: "bg-violet-50", text: "text-violet-600", dot: "bg-violet-500" },
  success: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" },
  neutral: { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-500" },
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
