import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  MapPin,
  CalendarRange,
  Wallet,
  Users,
  FileText,
  Package,
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
import { getObra } from "@/lib/actions/obras";
import {
  OBRA_STATUS_LABEL,
  OBRA_STATUS_TONE,
  calcularSaldo,
} from "@/lib/types/obra";
import { formatBRL, formatDateBR, formatCNPJ } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ObraDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const obra = await getObra(id);
  if (!obra) notFound();

  const cliente = obra.cliente;
  const saldo = calcularSaldo(obra.valor_total, obra.valor_medido);
  const statusTone = OBRA_STATUS_TONE[obra.status];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/obras"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className={cn("gap-1.5 font-medium", statusTone.bg, statusTone.text)}
              >
                <span className={cn("size-1.5 rounded-full", statusTone.dot)} />
                {OBRA_STATUS_LABEL[obra.status]}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">
                {obra.numero}
              </span>
              {obra.orcamento_id ? (
                <Link
                  href={`/comercial/orcamentos/${obra.orcamento_id}`}
                  className="text-xs text-foreground underline underline-offset-2"
                >
                  ver orçamento de origem
                </Link>
              ) : null}
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-2">
              {obra.nome}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {cliente?.razao_social ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/obras/${obra.id}/editar`}
            className={cn(buttonVariants({}), "gap-2")}
          >
            <Pencil className="size-4" />
            Editar
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Valor contratado"
          value={formatBRL(obra.valor_total)}
          detail="Soma total da obra"
        />
        <KpiCard
          label="Valor medido"
          value={formatBRL(obra.valor_medido)}
          detail={`${saldo.percentual_executado.toFixed(1)}% executado`}
        />
        <KpiCard
          label="Saldo a medir"
          value={formatBRL(saldo.saldo_restante)}
          detail={`${saldo.percentual_restante.toFixed(1)}% restante`}
        />
        <Card>
          <CardContent className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Andamento financeiro
            </div>
            <div className="mt-3">
              <Progress value={saldo.percentual_executado} className="h-2" />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Início</span>
              <span className="font-mono">{formatDateBR(obra.data_inicio)}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-muted-foreground">Previsão</span>
              <span className="font-mono">
                {formatDateBR(obra.data_fim_prevista)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>Informações principais da obra</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <InfoRow icon={Users} label="Responsável" value={obra.responsavel ?? "—"} />
            <InfoRow
              icon={MapPin}
              label="Local"
              value={
                obra.endereco
                  ? `${obra.endereco}${obra.cidade ? ` · ${obra.cidade}/${obra.estado ?? ""}` : ""}`
                  : obra.cidade
                    ? `${obra.cidade}/${obra.estado ?? ""}`
                    : "—"
              }
            />
            <InfoRow
              icon={CalendarRange}
              label="Cronograma"
              value={`${formatDateBR(obra.data_inicio) || "—"} → ${formatDateBR(obra.data_fim_prevista) || "—"}`}
            />
            <InfoRow
              icon={Wallet}
              label="Mão de obra"
              value={`${formatBRL(obra.mao_obra_direta)} direta · ${formatBRL(obra.mao_obra_indireta)} indireta`}
            />
            {obra.observacoes ? (
              <div className="sm:col-span-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
                  Observações
                </div>
                <p className="text-sm leading-relaxed">{obra.observacoes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Razão social
              </div>
              <div className="font-semibold">{cliente?.razao_social ?? "—"}</div>
              {cliente?.nome_fantasia ? (
                <div className="text-xs text-muted-foreground">
                  {cliente.nome_fantasia}
                </div>
              ) : null}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                CNPJ
              </div>
              <div className="font-mono text-sm">
                {cliente?.cnpj_cpf ? formatCNPJ(cliente.cnpj_cpf) : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Contato
              </div>
              <div className="text-sm">{cliente?.responsavel ?? "—"}</div>
              <div className="text-xs text-muted-foreground">
                {cliente?.cidade ? `${cliente.cidade}/${cliente.estado ?? ""}` : ""}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ComingSoonCard
          icon={FileText}
          title="Medições"
          description="Boletins de medição que abrem as contas a receber."
        />
        <ComingSoonCard
          icon={Package}
          title="Materiais e compras"
          description="Movimentações de almoxarifado e pedidos vinculados a esta obra."
        />
        <ComingSoonCard
          icon={Users}
          title="Equipe alocada"
          description="Colaboradores alocados na obra e produtividade."
        />
      </div>
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
      <div className="size-9 rounded-md bg-muted grid place-items-center shrink-0">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function ComingSoonCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-5 flex flex-col items-start gap-3">
        <div className="size-10 rounded-lg bg-muted grid place-items-center">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div>
          <div className="font-semibold">{title}</div>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          Em construção
        </Badge>
      </CardContent>
    </Card>
  );
}
