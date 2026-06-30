import {
  Users,
  CalendarClock,
  AlertTriangle,
  FileText,
  Plus,
  ArrowUpRight,
  Briefcase,
  Truck,
  Boxes,
  Cake,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBRL, formatDateBR } from "@/lib/format";
import { classificarDias, prazoLabel, VENC_LABEL, VENC_TONE } from "@/lib/vencimentos";
import {
  listColaboradores,
  listVencimentos,
} from "@/lib/actions/colaboradores";
import { listClientes } from "@/lib/actions/clientes";
import { listFornecedores } from "@/lib/actions/fornecedores";
import { listMateriais } from "@/lib/actions/materiais";
import { listOrcamentos } from "@/lib/actions/orcamentos";
import { getResumoRecebiveis } from "@/lib/actions/medicoes";
import { getCurrentProfile } from "@/lib/actions/usuarios";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const toneClasses: Record<string, { dot: string; text: string; bg: string }> = {
  ok: { dot: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" },
  info: { dot: "bg-sky-500", text: "text-sky-600", bg: "bg-sky-50" },
  warn: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  alert: { dot: "bg-rose-500", text: "text-rose-600", bg: "bg-rose-50" },
};

export default async function DashboardPage() {
  const [profile, colaboradores, vencimentos, clientes, fornecedores, materiais, orcamentos, recebiveis] =
    await Promise.all([
      getCurrentProfile(),
      listColaboradores(),
      listVencimentos(),
      listClientes(),
      listFornecedores(),
      listMateriais(),
      listOrcamentos(),
      getResumoRecebiveis(),
    ]);

  // Card de aniversariantes só para quem tem o módulo Pessoal (admin vê tudo).
  const podePessoal = profile?.role === "admin" || (profile?.modulos.includes("pessoal") ?? false);
  const podeFinanceiro =
    profile?.role === "admin" || (profile?.modulos.includes("financeiro") ?? false);
  const mesAtual = new Date().getMonth() + 1;
  const aniversariantesMes = colaboradores
    .filter((c) => c.status !== "desligado" && Number((c.data_nascimento ?? "").slice(5, 7)) === mesAtual)
    .map((c) => ({
      id: c.id,
      dia: Number((c.data_nascimento ?? "").slice(8, 10)),
      nome: c.nome_completo,
      cargo: c.cargo,
    }))
    .sort((a, b) => a.dia - b.dia || a.nome.localeCompare(b.nome));

  const ativos = colaboradores.filter((c) => c.status === "ativo").length;
  const emFerias = colaboradores.filter((c) => c.status === "ferias").length;
  const afastados = colaboradores.filter((c) => c.status === "afastado").length;

  const vencidos = vencimentos.filter((v) => (v.dias_para_vencer ?? 99999) < 0);
  const prox30 = vencimentos.filter(
    (v) => v.dias_para_vencer != null && v.dias_para_vencer >= 0 && v.dias_para_vencer <= 30,
  );
  const prox60 = vencimentos.filter(
    (v) => v.dias_para_vencer != null && v.dias_para_vencer > 30 && v.dias_para_vencer <= 60,
  );

  const orcAbertos = orcamentos.filter((o) => o.status === "rascunho" || o.status === "enviado");
  const valorAbertos = orcAbertos.reduce((s, o) => s + (o.valor_total ?? 0), 0);

  // Próximos a vencer (vencidos + até 60 dias), ordenados por urgência
  const proximos = vencimentos
    .filter((v) => v.dias_para_vencer != null && v.dias_para_vencer <= 60)
    .slice(0, 8);

  // Colaboradores por setor
  const porSetor = new Map<string, number>();
  for (const c of colaboradores) {
    const s = c.setor?.trim() || "Sem setor";
    porSetor.set(s, (porSetor.get(s) ?? 0) + 1);
  }
  const setores = [...porSetor.entries()].sort((a, b) => b[1] - a[1]);
  const maxSetor = Math.max(1, ...setores.map(([, n]) => n));

  const kpis = [
    {
      label: "Colaboradores ativos",
      value: `${ativos}`,
      detail: `${colaboradores.length} no total · ${emFerias} em férias · ${afastados} afastados`,
      tone: "ok" as const,
      icon: Users,
      href: "/pessoal/colaboradores",
    },
    {
      label: "Vencimentos vencidos",
      value: `${vencidos.length}`,
      detail: vencidos.length ? "Regularizar com urgência" : "Nada vencido",
      tone: vencidos.length ? ("alert" as const) : ("ok" as const),
      icon: AlertTriangle,
      href: "/pessoal/vencimentos",
    },
    {
      label: "Vencendo em 30 dias",
      value: `${prox30.length}`,
      detail: `+ ${prox60.length} entre 31 e 60 dias`,
      tone: prox30.length ? ("warn" as const) : ("ok" as const),
      icon: CalendarClock,
      href: "/pessoal/vencimentos",
    },
    {
      label: "Orçamentos em aberto",
      value: `${orcAbertos.length}`,
      detail: valorAbertos > 0 ? `${formatBRL(valorAbertos)} em negociação` : "Sem propostas abertas",
      tone: "info" as const,
      icon: FileText,
      href: "/comercial/orcamentos",
    },
  ];

  const cadastros = [
    { label: "Clientes", value: clientes.length, icon: Briefcase, href: "/cadastros/clientes" },
    { label: "Fornecedores", value: fornecedores.length, icon: Truck, href: "/cadastros/fornecedores" },
    { label: "Materiais", value: materiais.length, icon: Boxes, href: "/cadastros/materiais" },
    { label: "Colaboradores", value: colaboradores.length, icon: Users, href: "/pessoal/colaboradores" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Visão Geral da Operação</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Equipe, vencimentos e propostas — dados em tempo real.
          </p>
        </div>
        <Link href="/comercial/orcamentos/novo" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
          <Plus className="size-4" /> Nova proposta
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const tone = toneClasses[kpi.tone];
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} href={kpi.href}>
              <Card className="overflow-hidden transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                        {kpi.label}
                      </div>
                      <div className="text-3xl font-bold mt-2 tabular-nums">{kpi.value}</div>
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
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Próximos vencimentos</CardTitle>
              <CardDescription>ASO, treinamentos e férias a vencer (até 60 dias) ou vencidos</CardDescription>
            </div>
            <Link
              href="/pessoal/vencimentos"
              className="text-xs font-semibold text-primary-foreground bg-primary px-3 py-1.5 rounded-md hover:opacity-90 inline-flex items-center gap-1"
            >
              Ver todos <ArrowUpRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {proximos.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <CalendarClock className="size-8 opacity-40" />
                <p className="text-sm">Nada a vencer nos próximos 60 dias. 🎉</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                      <th className="text-left font-semibold py-2 pr-4">Colaborador</th>
                      <th className="text-left font-semibold py-2 px-2">Tipo</th>
                      <th className="text-left font-semibold py-2 px-2">Vencimento</th>
                      <th className="text-left font-semibold py-2 px-2">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proximos.map((v) => {
                      const status = classificarDias(v.dias_para_vencer);
                      const tone = VENC_TONE[status];
                      return (
                        <tr key={`${v.tipo}-${v.registro_id}`} className="border-b last:border-b-0 hover:bg-muted/40">
                          <td className="py-3 pr-4">
                            <Link href={`/pessoal/colaboradores/${v.colaborador_id}`} className="font-semibold hover:underline">
                              {v.colaborador}
                            </Link>
                            <div className="text-xs text-muted-foreground">{v.setor ?? "—"}</div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-xs">{v.tipo}</span>
                            <div className="text-xs text-muted-foreground">{v.descricao}</div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="text-xs">{formatDateBR(v.vencimento)}</div>
                            <div className="text-[11px] text-muted-foreground">{prazoLabel(v.dias_para_vencer)}</div>
                          </td>
                          <td className="py-3 px-2">
                            <Badge variant="secondary" className={cn("font-medium text-xs gap-1.5", tone.bg, tone.text)}>
                              <span className={cn("size-1.5 rounded-full", tone.dot)} />
                              {VENC_LABEL[status]}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {podePessoal && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Cake className="size-4 text-primary" />
                    Aniversariantes de {MESES[mesAtual - 1]}
                  </CardTitle>
                  <CardDescription>{aniversariantesMes.length} no mês</CardDescription>
                </div>
                <Link
                  href="/pessoal/relatorios"
                  className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline shrink-0"
                >
                  Ver <ArrowUpRight className="size-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {aniversariantesMes.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Cake className="size-7 opacity-40" />
                    <p className="text-sm">Ninguém faz aniversário em {MESES[mesAtual - 1]}.</p>
                  </div>
                ) : (
                  <ul className="space-y-2 max-h-72 overflow-y-auto">
                    {aniversariantesMes.map((a) => (
                      <li key={a.id} className="flex items-center gap-3">
                        <Badge variant="secondary" className="font-mono bg-primary/10 text-primary shrink-0">
                          {String(a.dia).padStart(2, "0")}/{String(mesAtual).padStart(2, "0")}
                        </Badge>
                        <div className="min-w-0">
                          <Link
                            href={`/pessoal/colaboradores/${a.id}`}
                            className="text-sm font-medium hover:underline truncate block"
                          >
                            {a.nome}
                          </Link>
                          <div className="text-xs text-muted-foreground truncate">{a.cargo}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {podeFinanceiro && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="size-4 text-primary" />
                  Contas a receber
                </CardTitle>
                <CardDescription>Carteira de medições</CardDescription>
              </div>
              <Link
                href="/financeiro/receber"
                className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline shrink-0"
              >
                Abrir <ArrowUpRight className="size-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">A receber</div>
                <div className="text-right">
                  <div className="font-bold tabular-nums">{formatBRL(recebiveis.aReceberTotal)}</div>
                  <div className="text-[11px] text-muted-foreground">{recebiveis.aReceberQtd} título(s)</div>
                </div>
              </div>
              <div
                className={cn(
                  "flex items-center justify-between rounded-md px-3 py-2",
                  recebiveis.vencidoQtd ? "bg-rose-50" : "bg-muted/40",
                )}
              >
                <div className={cn("text-sm font-medium", recebiveis.vencidoQtd ? "text-rose-700" : "text-muted-foreground")}>
                  Vencido
                </div>
                <div className="text-right">
                  <div className={cn("font-bold tabular-nums", recebiveis.vencidoQtd && "text-rose-700")}>
                    {formatBRL(recebiveis.vencidoTotal)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{recebiveis.vencidoQtd} em atraso</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Recebido no mês</div>
                <div className="text-right">
                  <div className="font-bold tabular-nums text-emerald-700">
                    {formatBRL(recebiveis.recebidoMesTotal)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{recebiveis.recebidoMesQtd} baixa(s)</div>
                </div>
              </div>
              {recebiveis.aFaturarQtd ? (
                <div className="text-xs text-amber-700 bg-amber-50 rounded-md px-3 py-2">
                  {recebiveis.aFaturarQtd} aprovada(s) sem NFS-e · {formatBRL(recebiveis.aFaturarTotal)} a faturar
                </div>
              ) : null}
            </CardContent>
          </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Cadastros</CardTitle>
              <CardDescription>Totais no sistema</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {cadastros.map((c) => {
                const Icon = c.icon;
                return (
                  <Link
                    key={c.label}
                    href={c.href}
                    className="rounded-lg border p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icon className="size-4" />
                      <span className="text-xs font-medium">{c.label}</span>
                    </div>
                    <div className="text-xl font-bold mt-1 tabular-nums">{c.value}</div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Colaboradores por setor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {setores.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado.</p>
              ) : (
                setores.map(([setor, n]) => (
                  <div key={setor}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{setor}</span>
                      <span className="tabular-nums text-muted-foreground">{n}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(n / maxSetor) * 100}%` }} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
