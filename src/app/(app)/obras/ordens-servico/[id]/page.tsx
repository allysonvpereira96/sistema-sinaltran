import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Printer,
  MapPin,
  CalendarRange,
  Clock,
  Truck,
  Gauge,
  HardHat,
  Users,
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
import { getOrdemServico } from "@/lib/actions/ordens-servico";
import { OS_STATUS_LABEL, OS_STATUS_TONE } from "@/lib/types/os";
import { formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const horaCurta = (h: string | null | undefined) => (h ? h.slice(0, 5) : "—");

export default async function OSDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const os = await getOrdemServico(id);
  if (!os) notFound();

  const statusTone = OS_STATUS_TONE[os.status];
  const clienteNome =
    os.cliente?.nome_fantasia ?? os.cliente?.razao_social ?? "—";
  const veiculo = os.veiculo
    ? `${os.veiculo.descricao}${os.veiculo.placa ? ` · ${os.veiculo.placa}` : ""}`
    : "—";
  const km =
    os.km_inicial != null || os.km_final != null
      ? `${os.km_inicial ?? "—"} → ${os.km_final ?? "—"}`
      : "—";

  return (
    <div className="p-6 lg:p-8 max-w-[1100px] mx-auto space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/obras/ordens-servico"
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
                {OS_STATUS_LABEL[os.status]}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">
                {os.numero}
              </span>
              {os.obra_id ? (
                <Link
                  href={`/obras/${os.obra_id}`}
                  className="text-xs text-foreground underline underline-offset-2"
                >
                  ver obra
                </Link>
              ) : null}
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-2">
              O.S {formatDateBR(os.data)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {os.obra?.nome ?? "—"} · {clienteNome}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/obras/ordens-servico/${os.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <Printer className="size-4" />
            Imprimir O.S
          </a>
          <Link
            href={`/obras/ordens-servico/${os.id}/editar`}
            className={cn(buttonVariants({}), "gap-2")}
          >
            <Pencil className="size-4" />
            Editar
          </Link>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>Dados da ordem de serviço</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <InfoRow icon={HardHat} label="Obra" value={os.obra?.nome ?? "—"} />
            <InfoRow
              icon={CalendarRange}
              label="Pedido OMIE"
              value={os.pedido_omie ?? "—"}
            />
            <InfoRow
              icon={MapPin}
              label="Cidade"
              value={os.cidade ?? "—"}
            />
            <InfoRow
              icon={Clock}
              label="Horário"
              value={`Saída ${horaCurta(os.hora_saida)} · Chegada ${horaCurta(os.hora_chegada)}`}
            />
            <InfoRow icon={Truck} label="Veículo" value={veiculo} />
            <InfoRow icon={Gauge} label="Quilometragem" value={km} />
            <InfoRow
              icon={Users}
              label="Encarregado"
              value={os.encarregado?.nome_completo ?? "—"}
            />
            <InfoRow
              icon={Users}
              label="Motorista"
              value={os.motorista?.nome_completo ?? "—"}
            />
            {os.observacoes ? (
              <div className="sm:col-span-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
                  Observações
                </div>
                <p className="text-sm leading-relaxed">{os.observacoes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipe CLT</CardTitle>
            <CardDescription>{os.equipe.length} colaboradores</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {os.equipe.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum colaborador na equipe.
              </p>
            ) : (
              <ol className="space-y-1.5">
                {os.equipe.map((m, i) => (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <span className="text-xs font-mono text-muted-foreground w-5">
                      {i + 1}.
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="font-medium block truncate">
                        {m.nome_completo}
                      </span>
                      {m.cargo ? (
                        <span className="text-xs text-muted-foreground block truncate">
                          {m.cargo}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {os.diaristas ? (
              <div className="pt-2 border-t">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
                  Diaristas
                </div>
                <p className="text-sm whitespace-pre-line">{os.diaristas}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
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
