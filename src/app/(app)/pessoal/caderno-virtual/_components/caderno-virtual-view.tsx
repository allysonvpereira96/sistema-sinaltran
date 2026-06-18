"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  FileSpreadsheet,
  Ban,
  FileText,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  OCORRENCIA_TIPO_LABEL,
  OCORRENCIA_TIPO_TONE,
  type OcorrenciaTipo,
} from "@/lib/mocks/colaboradores";
import type {
  OcorrenciaCaderno,
  ColaboradorResumo,
} from "@/lib/actions/caderno-virtual";
import type { CentroCustoResumo } from "@/lib/actions/colaboradores";
import { cn } from "@/lib/utils";
import { NovoRegistroModal } from "./novo-registro-modal";
import { DiaDialog } from "./dia-dialog";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const TIPOS: { value: OcorrenciaTipo | "todos"; label: string }[] = [
  { value: "todos", label: "Todos os tipos" },
  ...(Object.entries(OCORRENCIA_TIPO_LABEL) as [OcorrenciaTipo, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
];

type Props = {
  ano: number;
  mes: number; // 1..12
  tipoFiltro: OcorrenciaTipo | "todos";
  centroCustoFiltro: string;
  ocorrencias: OcorrenciaCaderno[];
  colaboradores: ColaboradorResumo[];
  centrosCusto: CentroCustoResumo[];
};

export function CadernoVirtualView({
  ano,
  mes,
  tipoFiltro,
  centroCustoFiltro,
  ocorrencias,
  colaboradores,
  centrosCusto,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [novoOpen, setNovoOpen] = useState(false);
  const [dataPreSelecionada, setDataPreSelecionada] = useState<string | null>(null);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  // ── KPIs do mês ──────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const faltas = ocorrencias.filter((o) => o.tipo === "falta").length;
    const atestados = ocorrencias.filter((o) => o.tipo === "atestado").length;
    const advertencias = ocorrencias.filter(
      (o) => o.tipo === "advertencia" || o.tipo === "suspensao",
    ).length;
    return { total: ocorrencias.length, faltas, atestados, advertencias };
  }, [ocorrencias]);

  // ── Agrupar ocorrências por data (YYYY-MM-DD) ────────────────────────────
  const porDia = useMemo(() => {
    const map = new Map<string, OcorrenciaCaderno[]>();
    for (const o of ocorrencias) {
      const arr = map.get(o.data) ?? [];
      arr.push(o);
      map.set(o.data, arr);
    }
    return map;
  }, [ocorrencias]);

  // ── Estrutura do mês (grid 7×6 ou 7×5) ───────────────────────────────────
  const calendario = useMemo(() => {
    const primeiroDia = new Date(Date.UTC(ano, mes - 1, 1));
    const ultimoDia = new Date(Date.UTC(ano, mes, 0));
    const diasNoMes = ultimoDia.getUTCDate();
    const diaSemanaInicio = primeiroDia.getUTCDay(); // 0=Dom..6=Sáb

    const celulas: ({
      dia: number;
      dataIso: string;
      isHoje: boolean;
      isFimSemana: boolean;
    } | null)[] = [];

    for (let i = 0; i < diaSemanaInicio; i++) celulas.push(null);

    const hoje = new Date();
    const hojeIso = `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, "0")}-${String(hoje.getUTCDate()).padStart(2, "0")}`;

    for (let d = 1; d <= diasNoMes; d++) {
      const dataIso = `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dataLocal = new Date(Date.UTC(ano, mes - 1, d));
      const dow = dataLocal.getUTCDay();
      celulas.push({
        dia: d,
        dataIso,
        isHoje: dataIso === hojeIso,
        isFimSemana: dow === 0 || dow === 6,
      });
    }

    // completar última linha
    while (celulas.length % 7 !== 0) celulas.push(null);

    return celulas;
  }, [ano, mes]);

  // ── Navegação de mês via URL params ──────────────────────────────────────
  function updateParams(next: Partial<Record<string, string>>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === undefined || v === "" || v === "todos") {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    }
    router.push(`/pessoal/caderno-virtual?${params.toString()}`);
  }

  function irPara(novoAno: number, novoMes: number) {
    let a = novoAno;
    let m = novoMes;
    if (m < 1) {
      m = 12;
      a -= 1;
    } else if (m > 12) {
      m = 1;
      a += 1;
    }
    updateParams({ ano: String(a), mes: String(m) });
  }

  function irParaHoje() {
    const hoje = new Date();
    updateParams({
      ano: String(hoje.getUTCFullYear()),
      mes: String(hoje.getUTCMonth() + 1),
    });
  }

  function abrirNovoNaData(dataIso: string) {
    setDataPreSelecionada(dataIso);
    setNovoOpen(true);
  }

  // ── Export CSV ───────────────────────────────────────────────────────────
  function exportarCsv() {
    const headers = [
      "Data",
      "Colaborador",
      "Matrícula",
      "Cargo",
      "Setor",
      "Tipo",
      "Descrição",
      "Observações",
    ];
    const linhas = ocorrencias
      .slice()
      .sort((a, b) => (a.data > b.data ? 1 : -1))
      .map((o) => [
        o.data,
        o.colaborador_nome,
        o.colaborador_matricula ?? "",
        o.colaborador_cargo ?? "",
        o.colaborador_setor ?? "",
        OCORRENCIA_TIPO_LABEL[o.tipo],
        o.descricao,
        o.observacoes ?? "",
      ]);
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const conteudo = [headers, ...linhas]
      .map((row) => row.map((c) => escape(String(c))).join(";"))
      .join("\r\n");
    const bom = "﻿"; // Excel reconhecer UTF-8
    const blob = new Blob([bom + conteudo], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `caderno-virtual-${ano}-${String(mes).padStart(2, "0")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const ocorrenciasDoDia = diaSelecionado ? porDia.get(diaSelecionado) ?? [] : [];

  return (
    <>
      {/* === KPIs === */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Registros no mês"
          value={kpis.total}
          icon={CalendarDays}
          tone="neutral"
        />
        <KpiCard
          label="Faltas"
          value={kpis.faltas}
          icon={Ban}
          tone="rose"
        />
        <KpiCard
          label="Atestados"
          value={kpis.atestados}
          icon={FileText}
          tone="amber"
        />
        <KpiCard
          label="Advertências / Suspensões"
          value={kpis.advertencias}
          icon={AlertTriangle}
          tone="orange"
        />
      </div>

      {/* === Toolbar (filtros + ações) === */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={tipoFiltro}
              onChange={(e) => updateParams({ tipo: e.target.value })}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {centrosCusto.length > 0 && (
              <select
                value={centroCustoFiltro}
                onChange={(e) => updateParams({ cc: e.target.value })}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="todos">Todos os centros de custo</option>
                {centrosCusto.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={exportarCsv}
              disabled={ocorrencias.length === 0}
            >
              <FileSpreadsheet className="size-4" />
              Exportar CSV
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-2"
              onClick={() => {
                setDataPreSelecionada(null);
                setNovoOpen(true);
              }}
            >
              <Plus className="size-4" />
              Novo registro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* === Calendário === */}
      <Card>
        <CardContent className="p-0">
          {/* Header do mês */}
          <div className="flex items-center justify-between p-4 border-b">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => irPara(ano, mes - 1)}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-3">
              <h2 className="text-base lg:text-lg font-semibold">
                {MESES[mes - 1]} {ano}
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={irParaHoje}
              >
                Hoje
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => irPara(ano, mes + 1)}
              aria-label="Próximo mês"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Dias da semana */}
          <div className="grid grid-cols-7 border-b">
            {DIAS_SEMANA.map((d) => (
              <div
                key={d}
                className="text-center py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid de dias */}
          <div className="grid grid-cols-7">
            {calendario.map((cel, idx) => {
              if (!cel) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[110px] border-b border-r bg-muted/20"
                  />
                );
              }
              const registros = porDia.get(cel.dataIso) ?? [];
              const mostrar = registros.slice(0, 3);
              const restantes = registros.length - mostrar.length;
              return (
                <button
                  key={cel.dataIso}
                  type="button"
                  onClick={() => {
                    if (registros.length > 0) {
                      setDiaSelecionado(cel.dataIso);
                    } else {
                      abrirNovoNaData(cel.dataIso);
                    }
                  }}
                  className={cn(
                    "text-left min-h-[110px] border-b border-r p-1.5 transition-colors group",
                    cel.isFimSemana && "bg-muted/30",
                    cel.isHoje && "bg-primary/5 ring-1 ring-primary/40 ring-inset",
                    registros.length > 0 && "hover:bg-muted/50",
                    registros.length === 0 && "hover:bg-muted/30",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        cel.isHoje
                          ? "text-primary"
                          : cel.isFimSemana
                            ? "text-muted-foreground"
                            : "text-foreground",
                      )}
                    >
                      {cel.dia}
                    </span>
                    {registros.length > 0 && (
                      <span className="text-[10px] font-semibold text-muted-foreground bg-background border rounded-full px-1.5">
                        {registros.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {mostrar.map((o) => {
                      const tone = OCORRENCIA_TIPO_TONE[o.tipo];
                      return (
                        <div
                          key={o.id}
                          className={cn(
                            "text-[10px] font-medium rounded px-1.5 py-0.5 truncate",
                            tone.bg,
                            tone.text,
                          )}
                          title={`${o.colaborador_nome} — ${o.descricao}`}
                        >
                          {OCORRENCIA_TIPO_LABEL[o.tipo]}
                        </div>
                      );
                    })}
                    {restantes > 0 && (
                      <div className="text-[10px] text-muted-foreground pl-1.5">
                        +{restantes} mais
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* === Modal de novo registro === */}
      <NovoRegistroModal
        open={novoOpen}
        onOpenChange={(v) => {
          setNovoOpen(v);
          if (!v) setDataPreSelecionada(null);
        }}
        colaboradores={colaboradores}
        dataPre={dataPreSelecionada}
      />

      {/* === Dialog de ocorrências do dia === */}
      <DiaDialog
        open={!!diaSelecionado}
        onOpenChange={(v) => {
          if (!v) setDiaSelecionado(null);
        }}
        dataIso={diaSelecionado}
        ocorrencias={ocorrenciasDoDia}
        onNovoRegistro={() => {
          if (diaSelecionado) {
            const d = diaSelecionado;
            setDiaSelecionado(null);
            abrirNovoNaData(d);
          }
        }}
      />
    </>
  );
}

/* ===========================================================================
 * KPI Card
 * ======================================================================== */

type Tone = "neutral" | "rose" | "amber" | "orange";
const TONE_MAP: Record<Tone, { bg: string; text: string; numText: string }> = {
  neutral: { bg: "bg-slate-50", text: "text-slate-600", numText: "text-foreground" },
  rose: { bg: "bg-rose-50", text: "text-rose-600", numText: "text-rose-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", numText: "text-amber-600" },
  orange: { bg: "bg-orange-50", text: "text-orange-600", numText: "text-orange-600" },
};

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
}) {
  const t = TONE_MAP[tone];
  return (
    <Card>
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {label}
          </div>
          <div className={cn("text-3xl font-bold mt-2 tabular-nums", t.numText)}>
            {value}
          </div>
        </div>
        <div className={cn("size-10 rounded-lg grid place-items-center", t.bg)}>
          <Icon className={cn("size-5", t.text)} />
        </div>
      </CardContent>
    </Card>
  );
}
