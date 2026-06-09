import {
  Building2,
  FileText,
  Clock,
  Users,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

const KPIS = [
  {
    label: "Obras em andamento",
    value: "8",
    detail: "2 iniciadas esta semana",
    tone: "ok" as const,
    icon: Building2,
  },
  {
    label: "Propostas em aberto",
    value: "5",
    detail: "R$ 184.500 em negociação",
    tone: "info" as const,
    icon: FileText,
  },
  {
    label: "Prazo crítico (≤ 5 dias)",
    value: "2",
    detail: "Requer atenção",
    tone: "alert" as const,
    icon: Clock,
  },
  {
    label: "Colaboradores alocados",
    value: "19/24",
    detail: "5 disponíveis",
    tone: "ok" as const,
    icon: Users,
  },
];

const OBRAS = [
  {
    code: "OB-2026-014",
    name: "Sinalização Av. Brasil",
    type: "Pintura viária",
    team: ["JM", "CS", "PA"],
    deadline: "22/mai",
    progress: 65,
    status: { label: "Em execução", tone: "info" as const },
  },
  {
    code: "OB-2026-013",
    name: "Tachas Rod. dos Bandeirantes",
    type: "Implantação",
    team: ["RA", "LM"],
    deadline: "17/mai",
    progress: 40,
    status: { label: "Prazo crítico", tone: "alert" as const },
  },
  {
    code: "OB-2026-011",
    name: "Placas Centro — Lote 3",
    type: "Sinalização vertical",
    team: ["FT", "PA", "+2"],
    deadline: "29/mai",
    progress: 80,
    status: { label: "Em execução", tone: "info" as const },
  },
  {
    code: "OB-2026-009",
    name: "Semáforos Bairro Industrial",
    type: "Instalação",
    team: ["JM", "LM"],
    deadline: "06/jun",
    progress: 25,
    status: { label: "Aguardando material", tone: "warn" as const },
  },
  {
    code: "OB-2026-007",
    name: "Repintura Faixas Escola Municipal",
    type: "Manutenção",
    team: ["CS", "PA"],
    deadline: "19/mai",
    progress: 92,
    status: { label: "Finalizando", tone: "ok" as const },
  },
];

const CARGA = [
  { mes: "Fev", obras: 6 },
  { mes: "Mar", obras: 7 },
  { mes: "Abr", obras: 9 },
  { mes: "Mai", obras: 12 },
  { mes: "Jun", obras: 8 },
];

const ATIVIDADE = [
  {
    title: "Proposta PR-2026-0026 aprovada",
    desc: "Prefeitura Municipal · R$ 48.200",
    time: "há 1h",
  },
  {
    title: "Obra OB-2026-014 atualizada para 65%",
    desc: "Equipe registrou avanço de 12 pontos",
    time: "há 3h",
  },
  {
    title: "Material recebido no almoxarifado",
    desc: "Tinta acrílica branca · 320 kg",
    time: "ontem",
  },
  {
    title: "Novo colaborador cadastrado",
    desc: "Renato A. · Operador de campo",
    time: "ontem",
  },
];

const toneClasses: Record<string, { dot: string; text: string; bg: string }> = {
  ok: { dot: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" },
  info: { dot: "bg-sky-500", text: "text-sky-600", bg: "bg-sky-50" },
  warn: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  alert: { dot: "bg-rose-500", text: "text-rose-600", bg: "bg-rose-50" },
};

const maxCarga = Math.max(...CARGA.map((c) => c.obras));

export default function DashboardPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            Visão Geral da Operação
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhamento das obras, propostas e equipes em tempo real.
          </p>
        </div>
        <Link
          href="/comercial/orcamentos"
          className={cn(buttonVariants({ size: "lg" }), "gap-2")}
        >
          <Plus className="size-4" /> Nova proposta
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((kpi) => {
          const tone = toneClasses[kpi.tone];
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      {kpi.label}
                    </div>
                    <div className="text-3xl font-bold mt-2">{kpi.value}</div>
                  </div>
                  <div className={cn("size-10 rounded-lg grid place-items-center", tone.bg)}>
                    <Icon className={cn("size-5", tone.text)} />
                  </div>
                </div>
                <div className={cn("text-xs mt-3 font-medium flex items-center gap-1", tone.text)}>
                  <span className={cn("size-1.5 rounded-full", tone.dot)} />
                  {kpi.detail}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Obras em andamento</CardTitle>
              <CardDescription>Andamento das obras ativas</CardDescription>
            </div>
            <Link
              href="/obras"
              className="text-xs font-semibold text-primary-foreground bg-primary px-3 py-1.5 rounded-md hover:opacity-90 inline-flex items-center gap-1"
            >
              Ver todas <ArrowUpRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                    <th className="text-left font-semibold py-2 pr-4">Obra</th>
                    <th className="text-left font-semibold py-2 px-2">Equipe</th>
                    <th className="text-left font-semibold py-2 px-2">Prazo</th>
                    <th className="text-left font-semibold py-2 px-2 w-44">Progresso</th>
                    <th className="text-left font-semibold py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {OBRAS.map((obra) => {
                    const tone = toneClasses[obra.status.tone];
                    return (
                      <tr key={obra.code} className="border-b last:border-b-0 hover:bg-muted/40">
                        <td className="py-3 pr-4">
                          <div className="font-semibold">{obra.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {obra.code} · {obra.type}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex -space-x-2">
                            {obra.team.map((t, i) => (
                              <Avatar key={i} className="size-7 border-2 border-card">
                                <AvatarFallback className="text-[10px] font-semibold bg-muted text-foreground/80">
                                  {t}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-2 font-mono text-xs text-muted-foreground">
                          {obra.deadline}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Progress value={obra.progress} className="h-1.5 flex-1" />
                            <span className="text-xs font-semibold w-9 text-right">
                              {obra.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "font-medium text-xs gap-1.5",
                              tone.bg,
                              tone.text,
                            )}
                          >
                            <span className={cn("size-1.5 rounded-full", tone.dot)} />
                            {obra.status.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Carga de obras por mês</CardTitle>
              <CardDescription>Distribuição do volume</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2 h-36">
                {CARGA.map((c) => {
                  const heightPct = (c.obras / maxCarga) * 100;
                  const isPeak = c.obras === maxCarga;
                  return (
                    <div
                      key={c.mes}
                      className="flex-1 flex flex-col items-center gap-2"
                    >
                      <div className="text-xs font-semibold text-foreground/80">
                        {c.obras}
                      </div>
                      <div className="w-full rounded-t-md bg-muted relative overflow-hidden flex-1 flex items-end">
                        <div
                          className={cn(
                            "w-full rounded-t-md transition-all",
                            isPeak ? "bg-primary" : "bg-muted-foreground/25",
                          )}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {c.mes}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Atividade recente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ATIVIDADE.map((a, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="size-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{a.desc}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0">
                    {a.time}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
