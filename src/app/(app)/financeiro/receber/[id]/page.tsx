import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  CalendarRange,
  Building2,
  User,
  HardHat,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import { getMedicao } from "@/lib/actions/medicoes";
import {
  MEDICAO_STATUS_LABEL,
  MEDICAO_STATUS_TONE,
} from "@/lib/types/medicao";
import { calcularSaldo } from "@/lib/types/obra";
import { formatBRL, formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ReceberButton } from "./_components/receber-button";

export const dynamic = "force-dynamic";

export default async function MedicaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const medicao = await getMedicao(id);
  if (!medicao) notFound();

  const obra = medicao.obra;
  const cliente = obra?.cliente;
  const tone = MEDICAO_STATUS_TONE[medicao.status];
  const saldoObra = obra
    ? calcularSaldo(obra.valor_total, medicao.obra_valor_medido)
    : null;
  const recebida = !!medicao.data_recebimento;

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/financeiro/receber"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className={cn("gap-1.5 font-medium", tone.bg, tone.text)}
              >
                <span className={cn("size-1.5 rounded-full", tone.dot)} />
                {MEDICAO_STATUS_LABEL[medicao.status]}
              </Badge>
              {recebida ? (
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                  Recebida em {formatDateBR(medicao.data_recebimento)}
                </Badge>
              ) : null}
              <span className="text-xs font-mono text-muted-foreground">
                Medição nº {String(medicao.numero).padStart(2, "0")}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-2">
              {obra?.nome ?? "—"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {obra ? (
                <Link href={`/obras/${obra.id}`} className="font-mono hover:underline">
                  {obra.numero}
                </Link>
              ) : null}
              {cliente ? ` · ${cliente.razao_social}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {medicao.status === "aprovada" ? (
            <ReceberButton medicaoId={medicao.id} recebida={recebida} />
          ) : null}
          <Link
            href={`/financeiro/receber/${medicao.id}/editar`}
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <Pencil className="size-4" />
            Editar
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Valor da medição"
          value={formatBRL(medicao.valor_total)}
          detail={`${medicao.percentual_executado.toFixed(1)}% executado no período`}
        />
        <KpiCard
          label="Período medido"
          value={`${formatDateBR(medicao.data_inicio)} → ${formatDateBR(medicao.data_fim)}`}
          detail="Intervalo coberto pelo boletim"
        />
        <KpiCard
          label="Aprovação"
          value={formatDateBR(medicao.data_aprovacao) || "—"}
          detail={
            medicao.data_aprovacao
              ? "Aprovada pelo cliente"
              : medicao.data_envio
                ? "Aguardando aprovação"
                : "Ainda não enviada"
          }
        />
        <KpiCard
          label={recebida ? "Recebido em" : "Prev. recebimento"}
          value={
            recebida
              ? formatDateBR(medicao.data_recebimento) || "—"
              : formatDateBR(medicao.data_previsao_recebimento) || "—"
          }
          detail={
            recebida
              ? "Baixa registrada"
              : medicao.data_previsao_recebimento
                ? "Data esperada de pagamento"
                : "Sem previsão"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resumo da medição</CardTitle>
            <CardDescription>Dados principais e detalhamento de período</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <InfoRow icon={CalendarRange} label="Data de envio" value={formatDateBR(medicao.data_envio) || "—"} />
            <InfoRow icon={CalendarRange} label="Data de aprovação" value={formatDateBR(medicao.data_aprovacao) || "—"} />
            <InfoRow icon={TrendingUp} label="% Executado no período" value={`${medicao.percentual_executado.toFixed(1)}%`} />
            <InfoRow icon={CalendarRange} label="Criada em" value={formatDateBR(medicao.created_at)} />
            {medicao.observacoes ? (
              <div className="sm:col-span-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
                  Observações
                </div>
                <p className="text-sm leading-relaxed">{medicao.observacoes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {obra && saldoObra ? (
          <Card>
            <CardHeader>
              <CardTitle>Obra vinculada</CardTitle>
              <CardDescription>Andamento financeiro geral</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow icon={HardHat} label="Número" value={obra.numero} />
              <InfoRow icon={Building2} label="Cliente" value={cliente?.razao_social ?? "—"} />
              <InfoRow icon={User} label="Responsável" value={obra.responsavel ?? "—"} />

              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Contratado</span>
                  <span className="font-semibold tabular-nums">
                    {formatBRL(obra.valor_total)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Medido</span>
                  <span className="font-semibold tabular-nums">
                    {formatBRL(medicao.obra_valor_medido)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Saldo</span>
                  <span className="font-semibold tabular-nums">
                    {formatBRL(saldoObra.saldo_restante)}
                  </span>
                </div>
                <Progress value={saldoObra.percentual_executado} className="h-1.5" />
                <div className="text-[11px] text-muted-foreground text-right">
                  {saldoObra.percentual_executado.toFixed(1)}% executado
                </div>
              </div>

              <Link
                href={`/obras/${obra.id}`}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), "w-full")}
              >
                Abrir obra
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {medicao.outras.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Outras medições desta obra</CardTitle>
            <CardDescription>Histórico de boletins</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                  <th className="text-left font-semibold py-2 px-4 w-16">Nº</th>
                  <th className="text-left font-semibold py-2 px-2">Período</th>
                  <th className="text-right font-semibold py-2 px-2">Valor</th>
                  <th className="text-center font-semibold py-2 px-2 w-20">%</th>
                  <th className="text-left font-semibold py-2 px-2">Aprovação</th>
                  <th className="text-left font-semibold py-2 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {medicao.outras.map((m) => {
                  const tn = MEDICAO_STATUS_TONE[m.status];
                  return (
                    <tr key={m.id} className="border-b last:border-b-0">
                      <td className="py-2 px-4 font-mono text-xs">
                        {String(m.numero).padStart(2, "0")}
                      </td>
                      <td className="py-2 px-2 text-xs">
                        {formatDateBR(m.data_inicio)} → {formatDateBR(m.data_fim)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums font-semibold">
                        {formatBRL(m.valor_total)}
                      </td>
                      <td className="py-2 px-2 text-center text-xs tabular-nums">
                        {m.percentual_executado.toFixed(0)}%
                      </td>
                      <td className="py-2 px-2 text-xs font-mono text-muted-foreground">
                        {formatDateBR(m.data_aprovacao)}
                      </td>
                      <td className="py-2 px-4">
                        <Badge variant="secondary" className={cn("gap-1.5 text-xs", tn.bg, tn.text)}>
                          <span className={cn("size-1.5 rounded-full", tn.dot)} />
                          {MEDICAO_STATUS_LABEL[m.status]}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </div>
        <div className="text-2xl font-bold mt-2 tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{detail}</div>
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-8 rounded-md bg-muted grid place-items-center shrink-0">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}
