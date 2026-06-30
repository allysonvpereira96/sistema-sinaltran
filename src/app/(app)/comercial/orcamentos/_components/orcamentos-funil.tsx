"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, List, HardHat, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  ORCAMENTO_STATUS_LABEL,
  ORCAMENTO_STATUS_TONE,
  type OrcamentoListRow,
  type OrcamentoStatus,
} from "@/lib/types/orcamento";
import { setOrcamentoStatus } from "@/lib/actions/orcamentos";
import { formatBRL, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";

const COLUNAS: OrcamentoStatus[] = [
  "rascunho",
  "enviado",
  "aprovado",
  "rejeitado",
  "perdido",
];

const clienteNome = (o: OrcamentoListRow) =>
  o.cliente?.nome_fantasia ?? o.cliente?.razao_social ?? "—";

export function OrcamentosFunil({
  orcamentos,
}: {
  orcamentos: OrcamentoListRow[];
}) {
  const router = useRouter();
  const [itens, setItens] = useState(orcamentos);
  const [busca, setBusca] = useState("");
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<OrcamentoStatus | null>(null);

  const filtrados = useMemo(() => {
    const q = normalizeSearch(busca);
    if (!q) return itens;
    return itens.filter(
      (o) =>
        normalizeSearch(o.numero).includes(q) ||
        normalizeSearch(o.descricao ?? "").includes(q) ||
        normalizeSearch(clienteNome(o)).includes(q),
    );
  }, [busca, itens]);

  const porColuna = useMemo(() => {
    const mapa = new Map<OrcamentoStatus, OrcamentoListRow[]>();
    for (const s of COLUNAS) mapa.set(s, []);
    for (const o of filtrados) mapa.get(o.status)?.push(o);
    return mapa;
  }, [filtrados]);

  async function mover(o: OrcamentoListRow, novo: OrcamentoStatus) {
    if (o.status === novo) return;
    const anterior = o.status;
    // Otimista: move o card imediatamente.
    setItens((prev) =>
      prev.map((x) => (x.id === o.id ? { ...x, status: novo } : x)),
    );
    const res = await setOrcamentoStatus(o.id, novo);
    if (res.ok) {
      toast.success(
        `"${o.numero}" → ${ORCAMENTO_STATUS_LABEL[novo]}`,
      );
      router.refresh();
    } else {
      // Reverte em caso de erro.
      setItens((prev) =>
        prev.map((x) => (x.id === o.id ? { ...x, status: anterior } : x)),
      );
      toast.error("Não foi possível mover", { description: res.error });
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1700px] mx-auto space-y-6">
      <PageHeader
        title="Funil de orçamentos"
        description="Arraste os cards entre as colunas para mudar o status. Orçamento aprovado vira obra pela tela do orçamento."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/comercial/orcamentos"
              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            >
              <List className="size-4" />
              Lista
            </Link>
            <Link
              href="/comercial/orcamentos/novo"
              className={cn(buttonVariants({ size: "default" }), "gap-2")}
            >
              <Plus className="size-4" />
              Novo orçamento
            </Link>
          </div>
        }
      />

      <div className="flex items-center gap-2 h-10 w-full lg:w-96 rounded-md border bg-background px-3 text-sm">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Filtrar por número, descrição ou cliente…"
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {COLUNAS.map((status) => {
          const cards = porColuna.get(status) ?? [];
          const total = cards.reduce((acc, c) => acc + c.valor_total, 0);
          const tone = ORCAMENTO_STATUS_TONE[status];
          const ativa = colunaAlvo === status;
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                if (colunaAlvo !== status) setColunaAlvo(status);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget === e.target) setColunaAlvo(null);
              }}
              onDrop={() => {
                const card = itens.find((x) => x.id === arrastando);
                setColunaAlvo(null);
                setArrastando(null);
                if (card) mover(card, status);
              }}
              className={cn(
                "flex flex-col rounded-xl border bg-muted/30 transition-colors",
                ativa && "border-primary/50 bg-primary/5 ring-2 ring-primary/20",
              )}
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", tone.dot)} />
                  <span className="text-sm font-semibold">
                    {ORCAMENTO_STATUS_LABEL[status]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {cards.length}
                  </span>
                </div>
                <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                  {formatBRL(total)}
                </span>
              </div>

              <div className="flex-1 space-y-2 p-2 min-h-32">
                {cards.length === 0 ? (
                  <div className="grid place-items-center h-24 text-xs text-muted-foreground/60">
                    Solte aqui
                  </div>
                ) : (
                  cards.map((o) => (
                    <article
                      key={o.id}
                      draggable
                      onDragStart={() => setArrastando(o.id)}
                      onDragEnd={() => {
                        setArrastando(null);
                        setColunaAlvo(null);
                      }}
                      onClick={() => router.push(`/comercial/orcamentos/${o.id}`)}
                      className={cn(
                        "group cursor-pointer rounded-lg border bg-background p-2.5 shadow-sm transition-shadow hover:shadow-md",
                        arrastando === o.id && "opacity-40",
                      )}
                    >
                      <div className="flex items-start gap-1.5">
                        <GripVertical className="size-3.5 shrink-0 mt-0.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {o.numero}
                            </span>
                            {o.obra_id ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600"
                                title="Já gerou obra"
                              >
                                <HardHat className="size-3" />
                                obra
                              </span>
                            ) : null}
                          </div>
                          <div className="text-sm font-semibold leading-tight line-clamp-2 mt-0.5">
                            {o.descricao ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            {clienteNome(o)}
                          </div>
                          <div className="text-xs font-semibold tabular-nums mt-1">
                            {formatBRL(o.valor_total)}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
