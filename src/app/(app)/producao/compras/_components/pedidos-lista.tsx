"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, CalendarClock, HardHat, Package } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  COMPRA_STATUS_LABEL,
  COMPRA_STATUS_ORDER,
  COMPRA_PRIORIDADE_LABEL,
  COMPRA_PRIORIDADE_TONE,
  type CompraPedidoListRow,
  type CompraStatus,
} from "@/lib/types/compras";
import { formatDateBR, formatBRL, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusTimeline } from "./status-timeline";

const STATUS_FILTRO: (CompraStatus | "todos" | "ativos")[] = [
  "ativos",
  "todos",
  ...COMPRA_STATUS_ORDER,
  "cancelado",
];

export function PedidosLista({
  pedidos,
  empresaNome,
}: {
  pedidos: CompraPedidoListRow[];
  empresaNome?: string | null;
}) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<CompraStatus | "todos" | "ativos">("ativos");
  const [obraId, setObraId] = useState("todas");

  const obrasFiltro = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pedidos) if (p.obra_id) map.set(p.obra_id, p.obra?.nome ?? "—");
    return [...map.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [pedidos]);

  const filtrados = useMemo(() => {
    const q = normalizeSearch(busca);
    return pedidos.filter((p) => {
      if (
        q &&
        !normalizeSearch(p.numero).includes(q) &&
        !normalizeSearch(p.titulo).includes(q) &&
        !normalizeSearch(p.obra?.nome ?? "").includes(q)
      )
        return false;
      if (status === "ativos" && p.status === "cancelado") return false;
      if (status !== "todos" && status !== "ativos" && p.status !== status) return false;
      if (obraId !== "todas" && p.obra_id !== obraId) return false;
      return true;
    });
  }, [pedidos, busca, status, obraId]);

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
      <PageHeader
        title={empresaNome ? `Compras · ${empresaNome}` : "Compras"}
        description="Pedidos de compra da empresa ativa — do pedido à retirada na obra. Solicitação → Triagem → Cotação → Aprovação → Compra → Entrega → Retirada."
        actions={
          <Link
            href="/producao/compras/novo"
            className={cn(buttonVariants({ size: "default" }), "gap-2")}
          >
            <Plus className="size-4" />
            Novo pedido
          </Link>
        }
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="flex items-center gap-2 h-10 w-full lg:w-80 rounded-md border bg-background px-3 text-sm">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar nº, título ou obra…"
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
              />
            </div>
            <select
              value={obraId}
              onChange={(e) => setObraId(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="todas">Todas as obras</option>
              {obrasFiltro.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTRO.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                aria-pressed={status === s}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  status === s
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted",
                )}
              >
                {s === "todos"
                  ? "Todos"
                  : s === "ativos"
                    ? "Em andamento"
                    : COMPRA_STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          <div className="text-xs text-muted-foreground">
            {filtrados.length} de {pedidos.length} pedido(s)
          </div>
        </CardContent>
      </Card>

      {filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {pedidos.length === 0
              ? "Nenhum pedido de compra ainda. Crie o primeiro vinculado a uma obra."
              : "Nenhum pedido encontrado com os filtros atuais."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtrados.map((p) => (
            <PedidoCard key={p.id} pedido={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PedidoCard({ pedido }: { pedido: CompraPedidoListRow }) {
  const prioridade = COMPRA_PRIORIDADE_TONE[pedido.prioridade];
  const atrasado =
    pedido.data_limite &&
    pedido.status !== "retirada" &&
    pedido.status !== "cancelado" &&
    pedido.data_limite < new Date().toISOString().slice(0, 10);

  return (
    <Link href={`/producao/compras/${pedido.id}`} className="block group">
      <Card className="transition-colors group-hover:border-primary/40">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-foreground/80">
                  {pedido.numero}
                </span>
                <Badge
                  variant="secondary"
                  className={cn("font-semibold", prioridade.bg, prioridade.text)}
                >
                  {COMPRA_PRIORIDADE_LABEL[pedido.prioridade]}
                </Badge>
                {pedido.valor_estimado > 0 ? (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatBRL(pedido.valor_estimado)}
                  </span>
                ) : null}
              </div>
              <div className="font-semibold truncate">{pedido.titulo}</div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <HardHat className="size-3.5" />
                  {pedido.obra ? `${pedido.obra.numero} · ${pedido.obra.nome}` : "Sem obra"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Package className="size-3.5" />
                  {pedido.itens_count} item(ns)
                </span>
                {pedido.solicitante_nome ? (
                  <span>Solicitante: {pedido.solicitante_nome}</span>
                ) : null}
              </div>
            </div>
            {pedido.data_limite ? (
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-medium shrink-0",
                  atrasado ? "text-rose-600" : "text-muted-foreground",
                )}
              >
                <CalendarClock className="size-3.5" />
                Limite: {formatDateBR(pedido.data_limite)}
              </div>
            ) : null}
          </div>

          <StatusTimeline status={pedido.status} size="sm" />
        </CardContent>
      </Card>
    </Link>
  );
}
