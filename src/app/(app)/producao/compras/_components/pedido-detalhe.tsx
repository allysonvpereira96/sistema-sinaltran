"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Ban,
  Check,
  ChevronRight,
  Plus,
  Trash2,
  Truck,
  PackageCheck,
  ClipboardCheck,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  avancarStatus,
  cancelarPedido,
  salvarTriagem,
  addCotacao,
  removeCotacao,
  selecionarCotacao,
  aprovarPedido,
  reprovarPedido,
  registrarEntrega,
  registrarRetirada,
} from "@/lib/actions/compras";
import {
  COMPRA_STATUS_LABEL,
  COMPRA_STATUS_TONE,
  COMPRA_PRIORIDADE_LABEL,
  COMPRA_PRIORIDADE_TONE,
  type CompraPedidoDetalhe,
  type CompraPedidoItem,
} from "@/lib/types/compras";
import { formatBRL, formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusTimeline } from "./status-timeline";
import type { FornecedorOption } from "./opcoes";

export function PedidoDetalhe({
  pedido,
  fornecedores,
}: {
  pedido: CompraPedidoDetalhe;
  fornecedores: FornecedorOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const tone = COMPRA_STATUS_TONE[pedido.status];
  const prio = COMPRA_PRIORIDADE_TONE[pedido.prioridade];

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, sucesso: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(sucesso);
        router.refresh();
      } else {
        toast.error("Erro", { description: res.error });
      }
    });
  }

  const totalItens = pedido.itens.reduce(
    (a, i) => a + i.quantidade * i.valor_estimado_unit,
    0,
  );

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/producao/compras"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{pedido.numero}</span>
              <Badge variant="secondary" className={cn("gap-1.5 font-medium", tone.bg, tone.text)}>
                <span className={cn("size-1.5 rounded-full", tone.dot)} />
                {COMPRA_STATUS_LABEL[pedido.status]}
              </Badge>
              <Badge variant="secondary" className={cn("font-semibold", prio.bg, prio.text)}>
                {COMPRA_PRIORIDADE_LABEL[pedido.prioridade]}
              </Badge>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-2">{pedido.titulo}</h1>
            {pedido.obra ? (
              <Link
                href={`/obras/${pedido.obra_id}`}
                className="text-sm text-muted-foreground underline underline-offset-2"
              >
                {pedido.obra.numero} · {pedido.obra.nome}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Sem obra vinculada</p>
            )}
          </div>
        </div>
        {pedido.status !== "retirada" && pedido.status !== "cancelado" ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-rose-600 hover:text-rose-700"
            disabled={pending}
            onClick={() => {
              if (confirm("Cancelar este pedido?")) run(() => cancelarPedido(pedido.id), "Pedido cancelado");
            }}
          >
            <Ban className="size-4" />
            Cancelar pedido
          </Button>
        ) : null}
      </header>

      {/* Timeline */}
      <Card>
        <CardContent className="p-5">
          <StatusTimeline status={pedido.status} historico={pedido.historico} />
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Valor estimado" value={formatBRL(pedido.valor_estimado || totalItens)} />
        <KpiCard
          label="Fornecedor"
          value={pedido.fornecedor?.nome ?? "—"}
          detail={pedido.valor_final ? `Final: ${formatBRL(pedido.valor_final)}` : undefined}
        />
        <KpiCard
          label="Solicitante"
          value={pedido.solicitante?.nome_completo ?? "—"}
          detail={`Aberto em ${formatDateBR(pedido.data_solicitacao)}`}
        />
        <KpiCard
          label="Prazo limite"
          value={pedido.data_limite ? formatDateBR(pedido.data_limite) : "—"}
        />
      </div>

      {/* Painel da etapa atual */}
      <PainelEtapa
        pedido={pedido}
        fornecedores={fornecedores}
        pending={pending}
        run={run}
      />

      {/* Itens */}
      <Card>
        <CardHeader>
          <CardTitle>Itens do pedido</CardTitle>
          <CardDescription>{pedido.itens.length} item(ns)</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Estoque / Comprar</TableHead>
                <TableHead className="text-right">Vlr unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedido.itens.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.descricao}</TableCell>
                  <TableCell>
                    {i.material_id ? (
                      <span className="text-xs text-sky-700">Catálogo</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Avulso</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {i.quantidade} {i.unidade}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                    {i.material_id ? `${i.qtd_estoque} / ${i.qtd_comprar}` : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBRL(i.valor_estimado_unit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBRL(i.quantidade * i.valor_estimado_unit)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Histórico */}
      {pedido.historico.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {pedido.historico.map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <span className="mt-1 size-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <div className="font-medium">
                      {COMPRA_STATUS_LABEL[h.para_status]}
                      {h.comentario ? (
                        <span className="font-normal text-muted-foreground"> — {h.comentario}</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {formatDateBR(h.created_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/* ===== Painel por etapa ===== */
function PainelEtapa({
  pedido,
  fornecedores,
  pending,
  run,
}: {
  pedido: CompraPedidoDetalhe;
  fornecedores: FornecedorOption[];
  pending: boolean;
  run: (
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
    sucesso: string,
  ) => void;
}) {
  switch (pedido.status) {
    case "solicitacao":
      return (
        <AcaoCard
          titulo="Solicitação registrada"
          descricao="Inicie a triagem para conferir o que há em estoque no almoxarifado."
        >
          <Button
            className="gap-2"
            disabled={pending}
            onClick={() => run(() => avancarStatus(pedido.id, "triagem"), "Triagem iniciada")}
          >
            Iniciar triagem <ChevronRight className="size-4" />
          </Button>
        </AcaoCard>
      );
    case "triagem":
      return <TriagemPanel pedido={pedido} pending={pending} run={run} />;
    case "cotacao":
      return (
        <CotacaoPanel pedido={pedido} fornecedores={fornecedores} pending={pending} run={run} />
      );
    case "aprovacao":
      return <AprovacaoPanel pedido={pedido} pending={pending} run={run} />;
    case "compra":
      return <CompraPanel pedido={pedido} pending={pending} run={run} />;
    case "entrega":
      return (
        <AcaoCard
          titulo="Mercadoria recebida — pronta para retirada"
          descricao="Registre a retirada para enviar o material à obra (saída do estoque = custo realizado)."
        >
          <Button
            className="gap-2"
            disabled={pending}
            onClick={() => run(() => registrarRetirada(pedido.id), "Material retirado para a obra")}
          >
            <PackageCheck className="size-4" /> Registrar retirada
          </Button>
        </AcaoCard>
      );
    case "retirada":
      return (
        <AcaoCard
          titulo="Pedido concluído"
          descricao="Material retirado e enviado à obra. O custo foi registrado no almoxarifado."
        >
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 gap-1.5">
            <Check className="size-3.5" /> Concluído
          </Badge>
        </AcaoCard>
      );
    default:
      return null;
  }
}

function TriagemPanel({
  pedido,
  pending,
  run,
}: {
  pedido: CompraPedidoDetalhe;
  pending: boolean;
  run: (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, sucesso: string) => void;
}) {
  const [linhas, setLinhas] = useState(
    pedido.itens.map((i) => ({
      id: i.id,
      qtd_estoque: i.qtd_estoque || 0,
      qtd_comprar: i.qtd_comprar || i.quantidade,
    })),
  );

  function set(id: string, campo: "qtd_estoque" | "qtd_comprar", valor: number) {
    setLinhas((arr) => arr.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)));
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>Triagem · conferência de estoque</CardTitle>
        <CardDescription>
          Para cada item, defina quanto será atendido pelo almoxarifado e quanto precisa ser comprado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Pedido</TableHead>
              <TableHead className="text-right">Saldo estoque</TableHead>
              <TableHead className="text-right w-28">Do estoque</TableHead>
              <TableHead className="text-right w-28">Comprar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedido.itens.map((i: CompraPedidoItem) => {
              const linha = linhas.find((l) => l.id === i.id)!;
              const catalogo = !!i.material_id;
              return (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">
                    {i.descricao}
                    {!catalogo ? (
                      <span className="ml-2 text-xs text-muted-foreground">(avulso)</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {i.quantidade} {i.unidade}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {catalogo ? (
                      <span
                        className={cn(
                          (i.saldo_estoque ?? 0) > 0 ? "text-emerald-600 font-medium" : "text-muted-foreground",
                        )}
                      >
                        {i.saldo_estoque ?? 0}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-8 text-right"
                      disabled={!catalogo}
                      value={linha.qtd_estoque}
                      onChange={(e) => set(i.id, "qtd_estoque", Number(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-8 text-right"
                      value={linha.qtd_comprar}
                      onChange={(e) => set(i.id, "qtd_comprar", Number(e.target.value) || 0)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex items-center justify-end">
          <Button
            className="gap-2"
            disabled={pending}
            onClick={() => run(() => salvarTriagem(pedido.id, linhas), "Triagem concluída")}
          >
            <ClipboardCheck className="size-4" /> Concluir triagem
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CotacaoPanel({
  pedido,
  fornecedores,
  pending,
  run,
}: {
  pedido: CompraPedidoDetalhe;
  fornecedores: FornecedorOption[];
  pending: boolean;
  run: (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, sucesso: string) => void;
}) {
  const [fornecedorId, setFornecedorId] = useState("");
  const [valor, setValor] = useState(0);
  const [prazo, setPrazo] = useState("");
  const [condicoes, setCondicoes] = useState("");

  function adicionar() {
    if (!fornecedorId || valor <= 0) {
      toast.error("Selecione o fornecedor e informe o valor.");
      return;
    }
    run(
      () =>
        addCotacao({
          pedido_id: pedido.id,
          fornecedor_id: fornecedorId,
          valor_total: valor,
          prazo_entrega_dias: prazo ? Number(prazo) : null,
          condicoes_pagamento: condicoes || null,
        }),
      "Cotação adicionada",
    );
    setFornecedorId("");
    setValor(0);
    setPrazo("");
    setCondicoes("");
  }

  const menor = Math.min(...pedido.cotacoes.map((c) => c.valor_total), Infinity);

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>Cotação · fornecedores</CardTitle>
        <CardDescription>
          Cadastre as cotações recebidas e selecione a vencedora para seguir à aprovação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pedido.cotacoes.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Prazo</TableHead>
                <TableHead>Condições</TableHead>
                <TableHead className="w-40 text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedido.cotacoes.map((c) => {
                const nome =
                  fornecedores.find((f) => f.id === c.fornecedor_id)?.nome ??
                  c.fornecedor_nome ??
                  "—";
                const melhor = c.valor_total === menor;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {nome}
                      {melhor ? (
                        <Badge variant="secondary" className="ml-2 bg-emerald-50 text-emerald-700">
                          melhor preço
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(c.valor_total)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.prazo_entrega_dias ? `${c.prazo_entrega_dias}d` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.condicoes_pagamento ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={pending}
                          onClick={() => run(() => selecionarCotacao(c.id, pedido.id), "Cotação selecionada")}
                        >
                          <Check className="size-3.5" /> Selecionar
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => run(() => removeCotacao(c.id, pedido.id), "Cotação removida")}
                          aria-label="Remover"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma cotação cadastrada ainda.</p>
        )}

        {/* Nova cotação */}
        <div className="rounded-md border bg-muted/30 p-3 grid gap-3 sm:grid-cols-12 items-end">
          <div className="sm:col-span-4">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Fornecedor
            </Label>
            <select
              value={fornecedorId}
              onChange={(e) => setFornecedorId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione…</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Valor total
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(Number(e.target.value) || 0)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Prazo (dias)
            </Label>
            <Input type="number" min="0" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Condições
            </Label>
            <Input
              value={condicoes}
              onChange={(e) => setCondicoes(e.target.value)}
              placeholder="Ex.: 30/60 dias"
            />
          </div>
          <div className="sm:col-span-1">
            <Button size="icon" className="w-full" disabled={pending} onClick={adicionar} aria-label="Adicionar cotação">
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AprovacaoPanel({
  pedido,
  pending,
  run,
}: {
  pedido: CompraPedidoDetalhe;
  pending: boolean;
  run: (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, sucesso: string) => void;
}) {
  const [comentario, setComentario] = useState("");
  const selecionada = pedido.cotacoes.find((c) => c.selecionada) ?? null;
  return (
    <Card className="border-amber-300">
      <CardHeader>
        <CardTitle>Aprovação</CardTitle>
        <CardDescription>
          Revise a cotação selecionada e aprove ou reprove o pedido.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Fornecedor</span>
            <span className="font-medium">{pedido.fornecedor?.nome ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-muted-foreground">Valor</span>
            <span className="font-bold tabular-nums">
              {formatBRL(selecionada?.valor_total ?? pedido.valor_final)}
            </span>
          </div>
        </div>
        <Textarea
          rows={2}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Comentário (opcional)"
        />
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            className="gap-2 text-rose-600 hover:text-rose-700"
            disabled={pending}
            onClick={() => run(() => reprovarPedido(pedido.id, comentario || null), "Pedido reprovado")}
          >
            <X className="size-4" /> Reprovar
          </Button>
          <Button
            className="gap-2"
            disabled={pending}
            onClick={() => run(() => aprovarPedido(pedido.id, comentario || null), "Pedido aprovado")}
          >
            <Check className="size-4" /> Aprovar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CompraPanel({
  pedido,
  pending,
  run,
}: {
  pedido: CompraPedidoDetalhe;
  pending: boolean;
  run: (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, sucesso: string) => void;
}) {
  const [nf, setNf] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>Compra · pedido ao fornecedor</CardTitle>
        <CardDescription>
          Pedido aprovado com {pedido.fornecedor?.nome ?? "fornecedor"}. Ao receber a mercadoria,
          registre a entrega — os itens de catálogo dão entrada no almoxarifado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Nota fiscal
            </Label>
            <Input value={nf} onChange={(e) => setNf(e.target.value)} placeholder="Nº da NF" />
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Data de entrega
            </Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-end">
          <Button
            className="gap-2"
            disabled={pending}
            onClick={() =>
              run(
                () => registrarEntrega(pedido.id, { numero_nf: nf || null, data_entrega: data }),
                "Entrega registrada — entrada no estoque",
              )
            }
          >
            <Truck className="size-4" /> Registrar entrega
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AcaoCard({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-primary/30">
      <CardContent className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold">{titulo}</div>
          <p className="text-sm text-muted-foreground mt-0.5">{descricao}</p>
        </div>
        <div className="shrink-0">{children}</div>
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
  detail?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </div>
        <div className="text-lg font-bold mt-1.5 truncate">{value}</div>
        {detail ? <div className="text-xs text-muted-foreground mt-1">{detail}</div> : null}
      </CardContent>
    </Card>
  );
}
