import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Wallet,
  CalendarRange,
  User,
  Building2,
  HardHat,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  ORCAMENTOS,
  ORCAMENTO_STATUS_LABEL,
  ORCAMENTO_STATUS_TONE,
} from "@/lib/mocks/orcamentos";
import { CLIENTES } from "@/lib/mocks/cadastros";
import { OBRAS } from "@/lib/mocks/obras";
import { formatBRL, formatDateBR, formatCNPJ, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ConverterEmObraButton } from "./_components/converter-em-obra";

export default async function OrcamentoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orcamento = ORCAMENTOS.find((o) => o.id === id);
  if (!orcamento) notFound();

  const cliente = CLIENTES.find((c) => c.id === orcamento.cliente_id);
  const tone = ORCAMENTO_STATUS_TONE[orcamento.status];
  const obraVinculada = orcamento.obra_id
    ? OBRAS.find((o) => o.id === orcamento.obra_id)
    : null;
  const podeConverter = orcamento.status === "aprovado" && !obraVinculada;

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/comercial/orcamentos"
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
                {ORCAMENTO_STATUS_LABEL[orcamento.status]}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">
                {orcamento.numero}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-2">
              {orcamento.descricao}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {cliente?.razao_social ?? "—"}
              {orcamento.cidade
                ? ` · ${orcamento.cidade}/${orcamento.estado ?? "—"}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/comercial/orcamentos/${orcamento.id}/editar`}
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <Pencil className="size-4" />
            Editar
          </Link>
          {podeConverter ? (
            <ConverterEmObraButton orcamentoId={orcamento.id} />
          ) : null}
        </div>
      </header>

      {obraVinculada ? (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="size-10 rounded-md bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
              <HardHat className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-emerald-900">
                Convertido em obra
              </div>
              <p className="text-sm text-emerald-700/90">
                Esta proposta originou a obra{" "}
                <Link
                  href={`/obras/${obraVinculada.id}`}
                  className="font-mono font-semibold underline"
                >
                  {obraVinculada.numero}
                </Link>{" "}
                — {obraVinculada.nome}.
              </p>
            </div>
            <Link
              href={`/obras/${obraVinculada.id}`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Ir para a obra
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Valor total"
          value={formatBRL(orcamento.valor_total)}
          detail={`${orcamento.itens.length} itens na proposta`}
        />
        <KpiCard
          label="Data de envio"
          value={formatDateBR(orcamento.data_envio) || "—"}
          detail={
            orcamento.data_envio ? "Enviada ao cliente" : "Ainda não enviada"
          }
        />
        <KpiCard
          label="Validade"
          value={formatDateBR(orcamento.data_validade) || "—"}
          detail={
            orcamento.data_validade ? "Prazo de validade" : "Sem prazo definido"
          }
        />
        <KpiCard
          label="Aprovação"
          value={formatDateBR(orcamento.data_aprovacao) || "—"}
          detail={
            orcamento.data_aprovacao ? "Cliente aprovou" : "Aguardando decisão"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Itens da proposta</CardTitle>
            <CardDescription>
              Descrição, quantidade e valor de cada item
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                  <th className="text-left font-semibold py-2 px-4 w-10">#</th>
                  <th className="text-left font-semibold py-2 px-2">Descrição</th>
                  <th className="text-center font-semibold py-2 px-2 w-16">Un.</th>
                  <th className="text-right font-semibold py-2 px-2 w-24">Qtd.</th>
                  <th className="text-right font-semibold py-2 px-2 w-28">
                    Val. unit.
                  </th>
                  <th className="text-right font-semibold py-2 px-4 w-32">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {orcamento.itens.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="py-2 px-4 text-xs font-mono text-muted-foreground">
                      {item.ordem}
                    </td>
                    <td className="py-2 px-2">{item.descricao}</td>
                    <td className="py-2 px-2 text-center text-xs uppercase">
                      {item.unidade_medida}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums">
                      {formatNumber(item.quantidade)}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-xs">
                      {formatBRL(item.valor_unitario)}
                    </td>
                    <td className="py-2 px-4 text-right tabular-nums font-semibold">
                      {formatBRL(item.valor_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-foreground/10">
                  <td colSpan={5} className="py-3 px-2 text-right text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Total da proposta
                  </td>
                  <td className="py-3 px-4 text-right text-lg font-bold tabular-nums">
                    {formatBRL(orcamento.valor_total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={Building2} label="Razão social" value={cliente?.razao_social ?? "—"} />
              <InfoRow icon={User} label="Contato" value={cliente?.responsavel ?? "—"} />
              <InfoRow
                icon={Wallet}
                label="CNPJ"
                value={cliente?.cnpj_cpf ? formatCNPJ(cliente.cnpj_cpf) : "—"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Local & responsável</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={User} label="Responsável" value={orcamento.responsavel} />
              <InfoRow
                icon={Building2}
                label="Local da obra"
                value={
                  orcamento.endereco
                    ? `${orcamento.endereco}${orcamento.cidade ? ` · ${orcamento.cidade}/${orcamento.estado ?? "—"}` : ""}`
                    : orcamento.cidade
                      ? `${orcamento.cidade}/${orcamento.estado ?? "—"}`
                      : "—"
                }
              />
              <InfoRow
                icon={CalendarRange}
                label="Criado em"
                value={formatDateBR(orcamento.created_at)}
              />
            </CardContent>
          </Card>

          {orcamento.observacoes ? (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{orcamento.observacoes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
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
      <div className="size-8 rounded-md bg-muted grid place-items-center shrink-0">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  );
}
