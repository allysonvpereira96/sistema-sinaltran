import { Fragment } from "react";
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
  FileSpreadsheet,
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
import { getOrcamento } from "@/lib/actions/orcamentos";
import {
  ORCAMENTO_STATUS_LABEL,
  ORCAMENTO_STATUS_TONE,
  BLOCO_TIPO_LABEL,
  BLOCO_DOC_LABEL,
  BLOCO_TIPO_TONE,
  type OrcamentoItemRow,
  type OrcamentoBlocoComItens,
} from "@/lib/types/orcamento";
import { formatBRL, formatDateBR, formatCNPJ, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ConverterEmObraButton } from "./_components/converter-em-obra";
import { GerarPdfButton } from "./_components/gerar-pdf";
import { NfRegimeToggle } from "./_components/nf-regime-toggle";

export const dynamic = "force-dynamic";

export default async function OrcamentoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orcamento = await getOrcamento(id);
  if (!orcamento) notFound();

  const cliente = orcamento.cliente;
  const empresa = orcamento.empresa;
  const tone = ORCAMENTO_STATUS_TONE[orcamento.status];

  const blocos = orcamento.blocos ?? [];
  const isImportado = blocos.length > 0;
  const blocoPorTipo = (t: "servicos" | "produtos" | "sinalshop") =>
    blocos.filter((b) => b.tipo === t).reduce((s, b) => s + b.valor_total, 0);

  // Agrupar itens por seção
  const secoes: { secao: string; itens: OrcamentoItemRow[]; subtotal: number }[] = [];
  for (const item of orcamento.itens) {
    const chave = item.secao ?? "GERAL";
    let bucket = secoes.find((s) => s.secao === chave);
    if (!bucket) {
      bucket = { secao: chave, itens: [], subtotal: 0 };
      secoes.push(bucket);
    }
    bucket.itens.push(item);
    bucket.subtotal += item.valor_total;
  }

  const totaisMo = orcamento.itens.reduce(
    (acc, i) => acc + i.valor_total_mao_obra,
    0,
  );
  const totaisMat = orcamento.itens.reduce(
    (acc, i) => acc + i.valor_total_material,
    0,
  );
  const podeConverter = orcamento.status === "aprovado" && !orcamento.obra_id;

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
              {orcamento.descricao ?? "—"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {empresa ? <span className="font-semibold">{empresa.nome}</span> : null}
              {empresa && cliente ? " · " : ""}
              {cliente?.razao_social ?? ""}
              {orcamento.cidade
                ? ` · ${orcamento.cidade}/${orcamento.estado ?? "—"}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <GerarPdfButton
            orcamentoId={orcamento.id}
            tipos={blocos.map((b) => b.tipo)}
          />
          {isImportado ? (
            <a
              href={`/comercial/orcamentos/${orcamento.id}/omie`}
              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            >
              <FileSpreadsheet className="size-4" />
              Exportar Omie
            </a>
          ) : null}
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

      {orcamento.obra_id ? (
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
                Esta proposta já originou uma obra.
              </p>
            </div>
            <Link
              href={`/obras/${orcamento.obra_id}`}
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
          detail={
            isImportado
              ? `${blocos.length} blocos · ${orcamento.itens.length} itens`
              : `${orcamento.itens.length} itens na proposta`
          }
        />
        {isImportado ? (
          <>
            <KpiCard
              label="Serviços"
              value={formatBRL(blocoPorTipo("servicos"))}
              detail="Sinaltran · Ordem de Serviço"
            />
            <KpiCard
              label="Produtos"
              value={formatBRL(blocoPorTipo("produtos"))}
              detail="Sinaltran · Pedido de Venda"
            />
            <KpiCard
              label="Sinalshop"
              value={formatBRL(blocoPorTipo("sinalshop"))}
              detail="Sinalshop · tintas"
            />
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {isImportado ? (
          <div className="lg:col-span-2 space-y-4">
            <NfRegimeToggle
              orcamentoId={orcamento.id}
              notaUnica={orcamento.emite_nota_unica_servico}
            />
            {blocos.map((bloco) => (
              <BlocoCard key={bloco.id} bloco={bloco} />
            ))}
          </div>
        ) : (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Itens da proposta</CardTitle>
            <CardDescription>
              Agrupados por seção, separando mão de obra de material
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                  <th className="text-left font-semibold py-2 px-4 w-10">#</th>
                  <th className="text-left font-semibold py-2 px-2">Descrição</th>
                  <th className="text-center font-semibold py-2 px-2 w-14">Un.</th>
                  <th className="text-right font-semibold py-2 px-2 w-20">Qtd.</th>
                  <th className="text-right font-semibold py-2 px-2 w-24">
                    MO un.
                  </th>
                  <th className="text-right font-semibold py-2 px-2 w-24">
                    Mat. un.
                  </th>
                  <th className="text-right font-semibold py-2 px-2 w-28">
                    Tot. MO
                  </th>
                  <th className="text-right font-semibold py-2 px-2 w-28">
                    Tot. Mat
                  </th>
                  <th className="text-right font-semibold py-2 px-4 w-32">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {secoes.map((s, si) => (
                  <Fragment key={s.secao}>
                    <tr className="bg-muted/40">
                      <td colSpan={9} className="py-2 px-4 text-[10px] uppercase tracking-[0.18em] font-bold text-foreground/80">
                        {si + 1}. {s.secao}
                      </td>
                    </tr>
                    {s.itens.map((item, ii) => (
                      <tr key={item.id} className="border-b last:border-b-0">
                        <td className="py-2 px-4 text-xs font-mono text-muted-foreground">
                          {si + 1}.{ii + 1}
                        </td>
                        <td className="py-2 px-2">{item.descricao}</td>
                        <td className="py-2 px-2 text-center text-xs uppercase">
                          {item.unidade_medida}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-xs">
                          {formatNumber(item.quantidade)}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-xs">
                          {item.valor_unit_mao_obra > 0
                            ? formatBRL(item.valor_unit_mao_obra)
                            : "—"}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-xs">
                          {item.valor_unit_material > 0
                            ? formatBRL(item.valor_unit_material)
                            : "—"}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-xs">
                          {item.valor_total_mao_obra > 0
                            ? formatBRL(item.valor_total_mao_obra)
                            : "—"}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-xs">
                          {item.valor_total_material > 0
                            ? formatBRL(item.valor_total_material)
                            : "—"}
                        </td>
                        <td className="py-2 px-4 text-right tabular-nums font-semibold">
                          {formatBRL(item.valor_total)}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-foreground/10">
                  <td colSpan={6} />
                  <td className="py-2 px-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
                    Total MO
                  </td>
                  <td className="py-2 px-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
                    Total Mat.
                  </td>
                  <td className="py-2 px-4 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
                    Total Geral
                  </td>
                </tr>
                <tr>
                  <td colSpan={6} />
                  <td className="py-2 px-2 text-right font-semibold tabular-nums text-sm">
                    {formatBRL(totaisMo)}
                  </td>
                  <td className="py-2 px-2 text-right font-semibold tabular-nums text-sm">
                    {formatBRL(totaisMat)}
                  </td>
                  <td className="py-3 px-4 text-right text-lg font-bold tabular-nums">
                    {formatBRL(orcamento.valor_total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
        )}

        <div className="space-y-4">
          {empresa ? (
            <Card>
              <CardHeader>
                <CardTitle>Empresa emissora</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow
                  icon={Building2}
                  label="Razão social"
                  value={empresa.razao_social}
                />
                <InfoRow
                  icon={Wallet}
                  label="CNPJ"
                  value={empresa.cnpj ? formatCNPJ(empresa.cnpj) : "—"}
                />
                {empresa.endereco ? (
                  <InfoRow
                    icon={Building2}
                    label="Endereço"
                    value={`${empresa.endereco}${empresa.cidade ? ` · ${empresa.cidade}/${empresa.estado ?? "—"}` : ""}`}
                  />
                ) : null}
              </CardContent>
            </Card>
          ) : null}

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
              <CardTitle>Condições de fornecimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow
                icon={User}
                label="Eng. responsável (cliente)"
                value={
                  orcamento.engenheiro_responsavel
                    ? `${orcamento.engenheiro_responsavel}${orcamento.crea_engenheiro ? ` · ${orcamento.crea_engenheiro}` : ""}`
                    : "—"
                }
              />
              <InfoRow
                icon={CalendarRange}
                label="Prazo de execução"
                value={orcamento.prazo_execucao ?? "—"}
              />
              <InfoRow
                icon={Wallet}
                label="Pagamento"
                value={orcamento.condicoes_pagamento ?? "—"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Local & responsável</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow icon={User} label="Responsável" value={orcamento.responsavel ?? "—"} />
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

function BlocoCard({ bloco }: { bloco: OrcamentoBlocoComItens }) {
  const tone = BLOCO_TIPO_TONE[bloco.tipo];
  const docLabel = bloco.omie_doc_tipo ? BLOCO_DOC_LABEL[bloco.omie_doc_tipo] : "—";
  const emissor = bloco.empresa?.nome ?? "—";
  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn("gap-1.5 font-medium", tone.bg, tone.text)}
            >
              <span className={cn("size-1.5 rounded-full", tone.dot)} />
              {BLOCO_TIPO_LABEL[bloco.tipo]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {emissor} · {docLabel}
              {bloco.omie_numero ? (
                <span className="font-mono"> Nº {bloco.omie_numero}</span>
              ) : null}
            </span>
          </div>
          <span className="text-base font-bold tabular-nums">
            {formatBRL(bloco.valor_total)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b">
              <th className="text-left font-semibold py-2 px-4 w-20">Código</th>
              <th className="text-left font-semibold py-2 px-2">Descrição</th>
              <th className="text-center font-semibold py-2 px-2 w-14">Un.</th>
              <th className="text-right font-semibold py-2 px-2 w-20">Qtd.</th>
              <th className="text-right font-semibold py-2 px-2 w-28">Vlr. unit.</th>
              <th className="text-right font-semibold py-2 px-4 w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {bloco.itens.map((item) => {
              const unit =
                item.valor_unit_mao_obra > 0
                  ? item.valor_unit_mao_obra
                  : item.valor_unit_material;
              return (
                <tr key={item.id} className="border-b last:border-b-0 align-top">
                  <td className="py-2 px-4 text-xs font-mono text-muted-foreground">
                    {item.codigo_omie ?? "—"}
                  </td>
                  <td className="py-2 px-2">
                    {item.descricao}
                    {item.ncm ? (
                      <span className="block text-[10px] text-muted-foreground">
                        NCM {item.ncm}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 px-2 text-center text-xs uppercase">
                    {item.unidade_medida}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-xs">
                    {formatNumber(item.quantidade)}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-xs">
                    {formatBRL(unit)}
                  </td>
                  <td className="py-2 px-4 text-right tabular-nums font-semibold">
                    {formatBRL(item.valor_total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-foreground/10 text-xs">
              <td colSpan={5} className="py-1.5 px-4 text-right text-muted-foreground">
                Subtotal
              </td>
              <td className="py-1.5 px-4 text-right tabular-nums">
                {formatBRL(bloco.valor_subtotal)}
              </td>
            </tr>
            {bloco.valor_ipi > 0 ? (
              <tr className="text-xs">
                <td colSpan={5} className="py-1 px-4 text-right text-muted-foreground">
                  IPI
                </td>
                <td className="py-1 px-4 text-right tabular-nums">
                  {formatBRL(bloco.valor_ipi)}
                </td>
              </tr>
            ) : null}
            {bloco.valor_icms_st > 0 ? (
              <tr className="text-xs">
                <td colSpan={5} className="py-1 px-4 text-right text-muted-foreground">
                  ICMS ST
                </td>
                <td className="py-1 px-4 text-right tabular-nums">
                  {formatBRL(bloco.valor_icms_st)}
                </td>
              </tr>
            ) : null}
            {bloco.valor_frete > 0 ? (
              <tr className="text-xs">
                <td colSpan={5} className="py-1 px-4 text-right text-muted-foreground">
                  Frete
                </td>
                <td className="py-1 px-4 text-right tabular-nums">
                  {formatBRL(bloco.valor_frete)}
                </td>
              </tr>
            ) : null}
            {bloco.valor_desconto > 0 ? (
              <tr className="text-xs">
                <td colSpan={5} className="py-1 px-4 text-right text-muted-foreground">
                  Desconto
                </td>
                <td className="py-1 px-4 text-right tabular-nums text-rose-600">
                  − {formatBRL(bloco.valor_desconto)}
                </td>
              </tr>
            ) : null}
            {bloco.valor_iss > 0 ? (
              <tr className="text-xs">
                <td colSpan={5} className="py-1 px-4 text-right text-muted-foreground">
                  ISS
                </td>
                <td className="py-1 px-4 text-right tabular-nums">
                  {formatBRL(bloco.valor_iss)}
                </td>
              </tr>
            ) : null}
            <tr>
              <td colSpan={5} className="py-2 px-4 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
                Total do bloco
              </td>
              <td className="py-2 px-4 text-right text-base font-bold tabular-nums">
                {formatBRL(bloco.valor_total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
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
