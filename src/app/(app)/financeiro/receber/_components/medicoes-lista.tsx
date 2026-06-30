"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileWarning,
  Search,
  Eye,
  Pencil,
  Trash2,
  BadgeCheck,
  Undo2,
  Download,
  List,
  Building2,
  CalendarRange,
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
  MEDICAO_SITUACAO_LABEL,
  MEDICAO_SITUACAO_TONE,
  FORMA_RECEBIMENTO_LABEL,
  medicaoSituacao,
  medicaoFaturada,
  type MedicaoListRow,
  type MedicaoSituacao,
} from "@/lib/types/medicao";
import { calcularSaldo } from "@/lib/types/obra";
import { deleteMedicao, marcarRecebida } from "@/lib/actions/medicoes";
import { formatBRL, formatDateBR, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BaixaDialog } from "./baixa-dialog";

type Filtro =
  | "todas"
  | "a_faturar"
  | "a_receber"
  | "vencidas"
  | "recebidas"
  | "rascunho"
  | "enviada";

type Vista = "lista" | "obras" | "fluxo";

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "a_faturar", label: "A faturar" },
  { value: "a_receber", label: "A receber" },
  { value: "vencidas", label: "Vencidas" },
  { value: "recebidas", label: "Recebidas" },
  { value: "rascunho", label: "Rascunhos" },
  { value: "enviada", label: "Enviadas" },
];

const VISTAS: { value: Vista; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "lista", label: "Lista", icon: List },
  { value: "obras", label: "Por obra", icon: Building2 },
  { value: "fluxo", label: "Fluxo de caixa", icon: CalendarRange },
];

const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

const hoje = new Date().toISOString().slice(0, 10);
const mesAtual = hoje.slice(0, 7);

const clienteNome = (m: MedicaoListRow) =>
  m.obra?.cliente?.nome_fantasia ?? m.obra?.cliente?.razao_social ?? "";

/** Valor que de fato entrou na baixa (parcial usa valor_recebido). */
const valorRecebidoDe = (m: MedicaoListRow) => m.valor_recebido ?? m.valor_total;

const pendente = (s: MedicaoSituacao) => s === "a_receber" || s === "vencida";

function mesLabel(ym: string) {
  const [ano, mes] = ym.split("-");
  return `${MESES[Number(mes) - 1] ?? "?"}/${ano}`;
}

export function MedicoesLista({ medicoes }: { medicoes: MedicaoListRow[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [obraId, setObraId] = useState<string>("todas");
  const [vista, setVista] = useState<Vista>("lista");

  const sit = (m: MedicaoListRow) => medicaoSituacao(m, hoje);

  const obrasFiltro = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of medicoes) {
      if (m.obra_id && m.obra && !map.has(m.obra_id)) {
        map.set(m.obra_id, `${m.obra.numero} — ${m.obra.nome}`);
      }
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [medicoes]);

  const filtradas = useMemo(() => {
    const q = normalizeSearch(busca);
    return medicoes.filter((m) => {
      if (q) {
        const hay = [
          m.obra?.nome,
          m.obra?.numero,
          clienteNome(m),
          m.numero_nf ?? "",
          m.observacoes ?? "",
          `medicao ${m.numero}`,
        ]
          .filter(Boolean)
          .map((s) => normalizeSearch(s as string))
          .join(" ");
        if (!hay.includes(q)) return false;
      }
      if (obraId !== "todas" && m.obra_id !== obraId) return false;
      const s = sit(m);
      switch (filtro) {
        case "a_faturar":
          return pendente(s) && !medicaoFaturada(m);
        case "a_receber":
          return pendente(s);
        case "vencidas":
          return s === "vencida";
        case "recebidas":
          return s === "recebida";
        case "rascunho":
          return s === "rascunho";
        case "enviada":
          return s === "enviada";
        default:
          return true;
      }
    });
  }, [medicoes, busca, filtro, obraId]);

  const counts = useMemo(() => {
    let aReceberTotal = 0,
      aReceberQtd = 0,
      vencidoTotal = 0,
      vencidoQtd = 0,
      aFaturarTotal = 0,
      aFaturarQtd = 0,
      recebidoMesTotal = 0,
      recebidoMesQtd = 0;
    for (const m of medicoes) {
      const s = sit(m);
      if (pendente(s)) {
        aReceberTotal += m.valor_total;
        aReceberQtd += 1;
        if (s === "vencida") {
          vencidoTotal += m.valor_total;
          vencidoQtd += 1;
        }
        if (!medicaoFaturada(m)) {
          aFaturarTotal += m.valor_total;
          aFaturarQtd += 1;
        }
      } else if (s === "recebida" && m.data_recebimento?.slice(0, 7) === mesAtual) {
        recebidoMesTotal += valorRecebidoDe(m);
        recebidoMesQtd += 1;
      }
    }
    return {
      aReceberTotal,
      aReceberQtd,
      vencidoTotal,
      vencidoQtd,
      aFaturarTotal,
      aFaturarQtd,
      recebidoMesTotal,
      recebidoMesQtd,
    };
  }, [medicoes]);

  // Agrupamento por obra (visão "Por obra").
  const porObra = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        label: string;
        cliente: string;
        contratado: number;
        medido: number;
        faturado: number;
        aReceber: number;
        recebido: number;
      }
    >();
    for (const m of medicoes) {
      if (!m.obra_id || !m.obra) continue;
      const cur =
        map.get(m.obra_id) ??
        {
          id: m.obra_id,
          label: `${m.obra.numero} — ${m.obra.nome}`,
          cliente: clienteNome(m),
          contratado: m.obra.valor_total ?? 0,
          medido: 0,
          faturado: 0,
          aReceber: 0,
          recebido: 0,
        };
      if (m.status !== "rejeitada") cur.medido += m.valor_total;
      if (medicaoFaturada(m)) cur.faturado += m.valor_total;
      const s = sit(m);
      if (pendente(s)) cur.aReceber += m.valor_total;
      if (s === "recebida") cur.recebido += valorRecebidoDe(m);
      map.set(m.obra_id, cur);
    }
    return [...map.values()].sort((a, b) => b.aReceber - a.aReceber);
  }, [medicoes]);

  // Fluxo de caixa: pendentes agrupados por mês de vencimento.
  const fluxo = useMemo(() => {
    const map = new Map<string, { total: number; qtd: number; vencido: boolean }>();
    let semVenc = 0;
    let semVencQtd = 0;
    for (const m of medicoes) {
      if (!pendente(sit(m))) continue;
      if (!m.data_vencimento) {
        semVenc += m.valor_total;
        semVencQtd += 1;
        continue;
      }
      const ym = m.data_vencimento.slice(0, 7);
      const cur = map.get(ym) ?? { total: 0, qtd: 0, vencido: ym < mesAtual };
      cur.total += m.valor_total;
      cur.qtd += 1;
      map.set(ym, cur);
    }
    const meses = [...map.entries()]
      .map(([ym, v]) => ({ ym, ...v }))
      .sort((a, b) => a.ym.localeCompare(b.ym));
    const max = Math.max(1, ...meses.map((m) => m.total));
    return { meses, max, semVenc, semVencQtd };
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

  async function handleDesfazer(m: MedicaoListRow) {
    if (!confirm(`Desfazer a baixa da medição nº ${m.numero}?`)) return;
    const res = await marcarRecebida(m.id, false);
    if (res.ok) {
      toast.success("Baixa desfeita");
      router.refresh();
    } else {
      toast.error("Erro", { description: res.error });
    }
  }

  function exportarCSV() {
    const header = [
      "Obra",
      "Cliente",
      "Medição",
      "Início",
      "Fim",
      "Valor",
      "NFS-e",
      "Faturamento",
      "Vencimento",
      "Situação",
      "Recebido em",
      "Valor recebido",
      "Forma",
    ];
    const cell = (v: string | number) => {
      const s = String(v ?? "");
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const num = (n: number | null | undefined) =>
      n == null ? "" : n.toFixed(2).replace(".", ",");
    const linhas = filtradas.map((m) =>
      [
        m.obra?.nome ?? "",
        clienteNome(m),
        m.numero,
        m.data_inicio,
        m.data_fim,
        num(m.valor_total),
        m.numero_nf ?? "",
        m.data_faturamento ?? "",
        m.data_vencimento ?? "",
        MEDICAO_SITUACAO_LABEL[sit(m)],
        m.data_recebimento ?? "",
        m.data_recebimento ? num(valorRecebidoDe(m)) : "",
        m.forma_recebimento ? FORMA_RECEBIMENTO_LABEL[m.forma_recebimento] : "",
      ]
        .map(cell)
        .join(";"),
    );
    const csv = [header.map(cell).join(";"), ...linhas].join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recebiveis-${hoje}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
      <PageHeader
        title="Medições / Contas a receber"
        description="Boletins de medição por obra: aprovação, faturamento (NFS-e), vencimento e baixa."
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
          label="A receber"
          value={formatBRL(counts.aReceberTotal)}
          detail={`${counts.aReceberQtd} título(s) em aberto`}
          icon={Clock}
          tone="info"
        />
        <KpiCard
          label="Vencido"
          value={formatBRL(counts.vencidoTotal)}
          detail={counts.vencidoQtd ? `${counts.vencidoQtd} título(s) em atraso` : "Nada em atraso"}
          icon={AlertTriangle}
          tone={counts.vencidoQtd ? "alert" : "ok"}
        />
        <KpiCard
          label="A faturar"
          value={formatBRL(counts.aFaturarTotal)}
          detail={`${counts.aFaturarQtd} aprovada(s) sem NFS-e`}
          icon={FileWarning}
          tone="warn"
        />
        <KpiCard
          label="Recebido no mês"
          value={formatBRL(counts.recebidoMesTotal)}
          detail={`${counts.recebidoMesQtd} baixa(s) em ${mesLabel(mesAtual)}`}
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      {/* Seletor de visão */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border bg-background p-0.5">
          {VISTAS.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.value}
                type="button"
                onClick={() => setVista(v.value)}
                aria-pressed={vista === v.value}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  vista === v.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-3.5" />
                {v.label}
              </button>
            );
          })}
        </div>
        {vista === "lista" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={exportarCSV}
            disabled={filtradas.length === 0}
            className="gap-1.5 ml-auto"
          >
            <Download className="size-3.5" />
            Exportar CSV
          </Button>
        ) : null}
      </div>

      {vista === "lista" ? (
        <>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2 h-10 w-full lg:w-96 rounded-md border bg-background px-3 text-sm">
                  <Search className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar por obra, cliente, NFS-e ou número…"
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
                {FILTROS.map((f) => (
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
                    <TableHead>NFS-e</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="w-40 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">
                        {medicoes.length === 0
                          ? "Nenhuma medição ainda. Crie uma medição vinculada a uma obra."
                          : "Nenhuma medição encontrada com os filtros atuais."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtradas.map((m) => {
                      const s = sit(m);
                      const tone = MEDICAO_SITUACAO_TONE[s];
                      const recebida = s === "recebida";
                      const parcial =
                        recebida &&
                        m.valor_recebido != null &&
                        m.valor_recebido < m.valor_total;
                      return (
                        <TableRow key={m.id}>
                          <TableCell>
                            <div className="font-semibold truncate max-w-[280px]" title={m.obra?.nome}>
                              {m.obra?.nome ?? "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <span className="font-mono">{m.obra?.numero}</span>
                              {clienteNome(m) ? ` · ${clienteNome(m)}` : ""}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-mono whitespace-nowrap">
                            nº {String(m.numero).padStart(2, "0")}
                            <div className="text-[10px] text-muted-foreground">
                              {m.percentual_executado.toFixed(0)}% exec.
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {m.numero_nf ? (
                              <span className="font-mono">{m.numero_nf}</span>
                            ) : pendente(s) ? (
                              <span className="text-amber-600 font-medium">a faturar</span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">
                            {formatBRL(m.valor_total)}
                            {parcial ? (
                              <div className="text-[10px] text-emerald-600 font-medium">
                                receb. {formatBRL(m.valor_recebido)}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {recebida ? (
                              <span className="text-emerald-600">
                                pago {formatDateBR(m.data_recebimento)}
                              </span>
                            ) : (
                              <span className={cn(s === "vencida" && "text-rose-600 font-semibold")}>
                                {formatDateBR(m.data_vencimento) ||
                                  (m.data_previsao_recebimento
                                    ? `prev. ${formatDateBR(m.data_previsao_recebimento)}`
                                    : "—")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={cn("gap-1.5 font-medium", tone.bg, tone.text)}
                            >
                              <span className={cn("size-1.5 rounded-full", tone.dot)} />
                              {MEDICAO_SITUACAO_LABEL[s]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              {pendente(s) ? (
                                <BaixaDialog
                                  medicaoId={m.id}
                                  valorTotal={m.valor_total}
                                  formaPadrao={m.forma_recebimento}
                                  trigger={
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      title="Registrar recebimento"
                                      aria-label="Registrar recebimento"
                                    >
                                      <BadgeCheck className="size-3.5 text-muted-foreground" />
                                    </Button>
                                  }
                                />
                              ) : recebida ? (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleDesfazer(m)}
                                  title="Desfazer baixa"
                                  aria-label="Desfazer baixa"
                                >
                                  <Undo2 className="size-3.5 text-muted-foreground" />
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
        </>
      ) : null}

      {vista === "obras" ? (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Obra / Cliente</TableHead>
                  <TableHead className="text-right">Contratado</TableHead>
                  <TableHead className="text-right">Medido</TableHead>
                  <TableHead className="text-right">Faturado</TableHead>
                  <TableHead className="text-right">A receber</TableHead>
                  <TableHead className="text-right">Recebido</TableHead>
                  <TableHead className="text-right">Saldo a medir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porObra.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">
                      Nenhuma medição cadastrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  porObra.map((o) => {
                    const { saldo_restante } = calcularSaldo(o.contratado, o.medido);
                    return (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer"
                        onClick={() => {
                          setObraId(o.id);
                          setVista("lista");
                        }}
                      >
                        <TableCell>
                          <div className="font-semibold truncate max-w-[320px]">{o.label}</div>
                          {o.cliente ? (
                            <div className="text-xs text-muted-foreground">{o.cliente}</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatBRL(o.contratado)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatBRL(o.medido)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatBRL(o.faturado)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-amber-700">
                          {formatBRL(o.aReceber)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-emerald-700">
                          {formatBRL(o.recebido)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {formatBRL(saldo_restante)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {vista === "fluxo" ? (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Previsão de recebimentos</h2>
              <p className="text-xs text-muted-foreground">
                Títulos em aberto agrupados pelo mês de vencimento. Meses anteriores a{" "}
                {mesLabel(mesAtual)} já estão vencidos.
              </p>
            </div>
            {fluxo.meses.length === 0 && fluxo.semVenc === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum título em aberto. 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {fluxo.meses.map((m) => (
                  <div key={m.ym}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className={cn("font-medium", m.vencido && "text-rose-600")}>
                        {mesLabel(m.ym)}
                        {m.vencido ? " · vencido" : ""}
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          · {m.qtd} título(s)
                        </span>
                      </span>
                      <span className="tabular-nums font-semibold">{formatBRL(m.total)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", m.vencido ? "bg-rose-500" : "bg-primary")}
                        style={{ width: `${(m.total / fluxo.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {fluxo.semVenc > 0 ? (
                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">
                      Sem vencimento definido · {fluxo.semVencQtd} título(s)
                    </span>
                    <span className="tabular-nums font-semibold">{formatBRL(fluxo.semVenc)}</span>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

type Tone = "ok" | "info" | "warn" | "alert" | "success";
const TONE_CLASSES: Record<Tone, { bg: string; text: string; dot: string }> = {
  ok: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" },
  info: { bg: "bg-sky-50", text: "text-sky-600", dot: "bg-sky-500" },
  warn: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
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
            <div className="text-2xl font-bold mt-2 tabular-nums">{value}</div>
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
