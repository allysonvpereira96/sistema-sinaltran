"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  FileText,
  CheckCircle2,
  Send,
  Search,
  Eye,
  Pencil,
  Trash2,
  TrendingUp,
  FileSpreadsheet,
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
  ORCAMENTO_STATUS_LABEL,
  ORCAMENTO_STATUS_TONE,
  type OrcamentoListRow,
  type OrcamentoStatus,
} from "@/lib/types/orcamento";
import { deleteOrcamento } from "@/lib/actions/orcamentos";
import { formatBRL, formatDateBR, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GerarPdfButton } from "../[id]/_components/gerar-pdf";
import { NfRegimeMini } from "../[id]/_components/nf-regime-mini";

type FiltroRapido = "todos" | OrcamentoStatus;

const FILTROS_RAPIDOS: { value: FiltroRapido; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "rascunho", label: "Rascunhos" },
  { value: "enviado", label: "Enviados" },
  { value: "aprovado", label: "Aprovados" },
  { value: "rejeitado", label: "Rejeitados" },
];

const clienteNome = (o: OrcamentoListRow) =>
  o.cliente?.nome_fantasia ?? o.cliente?.razao_social ?? "—";

export function OrcamentosLista({
  orcamentos,
}: {
  orcamentos: OrcamentoListRow[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroRapido>("todos");
  const [clienteId, setClienteId] = useState<string>("todos");

  // Clientes distintos presentes nos orçamentos (para o filtro)
  const clientesFiltro = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of orcamentos) {
      if (o.cliente_id && !map.has(o.cliente_id)) {
        map.set(o.cliente_id, clienteNome(o));
      }
    }
    return [...map.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [orcamentos]);

  const filtrados = useMemo(() => {
    const q = normalizeSearch(busca);
    return orcamentos.filter((o) => {
      if (
        q &&
        !normalizeSearch(o.numero).includes(q) &&
        !normalizeSearch(o.descricao ?? "").includes(q) &&
        !normalizeSearch(o.responsavel ?? "").includes(q) &&
        !normalizeSearch(clienteNome(o)).includes(q)
      ) {
        return false;
      }
      if (clienteId !== "todos" && o.cliente_id !== clienteId) return false;
      if (filtro !== "todos" && o.status !== filtro) return false;
      return true;
    });
  }, [busca, filtro, clienteId, orcamentos]);

  const counts = useMemo(() => {
    const aprovados = orcamentos.filter((o) => o.status === "aprovado");
    const enviados = orcamentos.filter((o) => o.status === "enviado");
    const aprovadosTotal = aprovados.reduce((acc, o) => acc + o.valor_total, 0);
    const enviadosTotal = enviados.reduce((acc, o) => acc + o.valor_total, 0);
    const totalAprovavel = enviados.length + aprovados.length;
    const taxaAprovacao = totalAprovavel
      ? (aprovados.length / totalAprovavel) * 100
      : 0;
    return {
      enviados: enviados.length,
      aprovados: aprovados.length,
      enviadosTotal,
      aprovadosTotal,
      totalGeral: orcamentos.length,
      taxaAprovacao,
    };
  }, [orcamentos]);

  async function handleDelete(o: OrcamentoListRow) {
    if (
      !confirm(
        `Excluir o orçamento "${o.numero}"? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    const res = await deleteOrcamento(o.id);
    if (res.ok) {
      toast.success("Orçamento excluído");
      router.refresh();
    } else {
      toast.error("Erro ao excluir", { description: res.error });
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
      <PageHeader
        title="Orçamentos"
        description="Propostas comerciais — itens, valores e prazos. Orçamento aprovado vira obra em 1 clique."
        actions={
          <Link
            href="/comercial/orcamentos/novo"
            className={cn(buttonVariants({ size: "default" }), "gap-2")}
          >
            <Plus className="size-4" />
            Novo orçamento
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Em negociação"
          value={String(counts.enviados)}
          detail={formatBRL(counts.enviadosTotal)}
          icon={Send}
          tone="info"
        />
        <KpiCard
          label="Aprovados"
          value={String(counts.aprovados)}
          detail={formatBRL(counts.aprovadosTotal)}
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          label="Taxa de aprovação"
          value={`${counts.taxaAprovacao.toFixed(0)}%`}
          detail="Aprovados / (Enviados + Aprovados)"
          icon={TrendingUp}
          tone="ok"
        />
        <KpiCard
          label="Total cadastrados"
          value={String(counts.totalGeral)}
          detail="Em todos os status"
          icon={FileText}
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
                placeholder="Buscar por número, descrição, cliente ou responsável…"
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
              {filtrados.length} de {orcamentos.length} orçamentos
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº / Descrição</TableHead>
                <TableHead className="w-[220px]">Cliente</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Envio</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-52 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">
                    {orcamentos.length === 0
                      ? "Nenhum orçamento cadastrado ainda. Clique em “Novo orçamento” para começar."
                      : "Nenhum orçamento encontrado com os filtros atuais."}
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((o) => {
                  const tone = ORCAMENTO_STATUS_TONE[o.status];
                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <div className="font-mono text-xs text-muted-foreground">
                          {o.numero}
                          {o.empresa ? ` · ${o.empresa.nome}` : ""}
                          {o.cidade ? ` · ${o.cidade}/${o.estado ?? "—"}` : ""}
                        </div>
                        <div className="font-semibold mt-0.5">
                          {o.descricao ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span
                          className="block max-w-[220px] truncate"
                          title={clienteNome(o)}
                        >
                          {clienteNome(o)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{o.responsavel ?? "—"}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {formatDateBR(o.data_envio)}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {formatDateBR(o.data_validade)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formatBRL(o.valor_total)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("gap-1.5 font-medium", tone.bg, tone.text)}
                        >
                          <span className={cn("size-1.5 rounded-full", tone.dot)} />
                          {ORCAMENTO_STATUS_LABEL[o.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <GerarPdfButton
                            orcamentoId={o.id}
                            tipos={(o.blocos ?? []).map((b) => b.tipo)}
                            iconOnly
                          />
                          {(o.blocos?.length ?? 0) > 0 ? (
                            <>
                              <NfRegimeMini
                                orcamentoId={o.id}
                                notaUnica={o.emite_nota_unica_servico}
                              />
                              <a
                                href={`/comercial/orcamentos/${o.id}/omie`}
                                className={cn(
                                  buttonVariants({ variant: "ghost", size: "icon-sm" }),
                                )}
                                aria-label="Exportar Omie"
                                title="Exportar planilhas para o Omie"
                              >
                                <FileSpreadsheet className="size-3.5" />
                              </a>
                            </>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => router.push(`/comercial/orcamentos/${o.id}`)}
                            aria-label="Ver detalhes"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => router.push(`/comercial/orcamentos/${o.id}/editar`)}
                            aria-label="Editar"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(o)}
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
