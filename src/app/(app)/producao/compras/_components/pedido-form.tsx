"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, ArrowLeft, Plus, X, Search, Trash2, Boxes, Building2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPedido, type PedidoInput } from "@/lib/actions/compras";
import { COMPRA_PRIORIDADE_LABEL, type CompraPrioridade } from "@/lib/types/compras";
import { formatBRL, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/app/searchable-select";
import type { ObraOption, MaterialOption } from "./opcoes";

type ItemLinha = {
  key: string;
  material_id: string | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_estimado_unit: number;
  observacoes: string;
};

const PRIORIDADES: CompraPrioridade[] = ["baixa", "media", "alta", "urgente"];

let seq = 0;
const novaLinha = (): ItemLinha => ({
  key: `i${seq++}`,
  material_id: null,
  descricao: "",
  unidade: "UN",
  quantidade: 1,
  valor_estimado_unit: 0,
  observacoes: "",
});

export function PedidoForm({
  obras,
  materiais,
  empresaNome,
}: {
  obras: ObraOption[];
  materiais: MaterialOption[];
  empresaNome?: string | null;
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [obraId, setObraId] = useState("");
  const [prioridade, setPrioridade] = useState<CompraPrioridade>("media");
  const [dataLimite, setDataLimite] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [itens, setItens] = useState<ItemLinha[]>([novaLinha()]);
  const [salvando, setSalvando] = useState(false);

  const total = useMemo(
    () => itens.reduce((acc, i) => acc + i.quantidade * i.valor_estimado_unit, 0),
    [itens],
  );

  function patch(key: string, patch: Partial<ItemLinha>) {
    setItens((arr) => arr.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }
  function vincular(key: string, m: MaterialOption) {
    patch(key, {
      material_id: m.id,
      descricao: m.descricao,
      unidade: m.unidade_medida,
      valor_estimado_unit: m.valor_referencia,
    });
  }
  function desvincular(key: string) {
    patch(key, { material_id: null });
  }
  function remover(key: string) {
    setItens((arr) => (arr.length === 1 ? arr : arr.filter((i) => i.key !== key)));
  }

  async function salvar() {
    if (!titulo.trim()) {
      toast.error("Informe um título para o pedido.");
      return;
    }
    const validos = itens.filter((i) => i.descricao.trim() && i.quantidade > 0);
    if (validos.length === 0) {
      toast.error("Adicione ao menos um item com descrição e quantidade.");
      return;
    }
    setSalvando(true);
    const input: PedidoInput = {
      titulo: titulo.trim(),
      obra_id: obraId || null,
      prioridade,
      data_limite: dataLimite || null,
      justificativa: justificativa || null,
      itens: validos.map((i) => ({
        material_id: i.material_id,
        descricao: i.descricao.trim(),
        unidade: i.unidade || "UN",
        quantidade: i.quantidade,
        valor_estimado_unit: i.valor_estimado_unit,
        observacoes: i.observacoes || null,
      })),
    };
    const res = await createPedido(input);
    setSalvando(false);
    if (!res.ok) {
      toast.error("Erro ao criar pedido", { description: res.error });
      return;
    }
    toast.success("Pedido criado");
    router.push("id" in res ? `/producao/compras/${res.id}` : "/producao/compras");
    router.refresh();
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1100px] mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <Link
          href="/producao/compras"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Novo pedido de compra</h1>
            {empresaNome ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <Building2 className="size-3" />
                {empresaNome}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Solicitação de materiais/serviços vinculada a uma obra.
            {empresaNome ? ` O pedido será da empresa ${empresaNome}.` : ""}
          </p>
        </div>
      </header>

      {/* Dados do pedido */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da solicitação</CardTitle>
          <CardDescription>Obra, prioridade e prazo</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Título / descrição curta *" className="sm:col-span-2">
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Gerador 9KVA para a obra do trecho 07"
            />
          </Field>
          <Field label="Obra">
            <SearchableSelect
              options={obras.map((o) => ({
                value: o.id,
                label: `${o.numero} — ${o.nome}`,
                hint: o.cidade ?? undefined,
              }))}
              value={obraId}
              onChange={setObraId}
              placeholder="Selecione a obra…"
            />
          </Field>
          <Field label="Prioridade">
            <NativeSelect
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as CompraPrioridade)}
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {COMPRA_PRIORIDADE_LABEL[p]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Prazo limite">
            <Input type="date" value={dataLimite} onChange={(e) => setDataLimite(e.target.value)} />
          </Field>
          <Field label="Justificativa" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Por que esta compra é necessária?"
            />
          </Field>
        </CardContent>
      </Card>

      {/* Itens */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Itens</CardTitle>
            <CardDescription>
              Materiais do catálogo ou itens avulsos (locações, serviços, texto livre)
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Estimado</div>
            <div className="font-bold tabular-nums">{formatBRL(total)}</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {itens.map((item, idx) => (
            <ItemRow
              key={item.key}
              item={item}
              index={idx}
              materiais={materiais}
              onPatch={(p) => patch(item.key, p)}
              onVincular={(m) => vincular(item.key, m)}
              onDesvincular={() => desvincular(item.key)}
              onRemover={() => remover(item.key)}
              podeRemover={itens.length > 1}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setItens((arr) => [...arr, novaLinha()])}
          >
            <Plus className="size-4" />
            Adicionar item
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Link href="/producao/compras" className={cn(buttonVariants({ variant: "outline" }))}>
          Cancelar
        </Link>
        <Button onClick={salvar} disabled={salvando} className="gap-2">
          <Save className="size-4" />
          {salvando ? "Salvando…" : "Criar pedido"}
        </Button>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  index,
  materiais,
  onPatch,
  onVincular,
  onDesvincular,
  onRemover,
  podeRemover,
}: {
  item: ItemLinha;
  index: number;
  materiais: MaterialOption[];
  onPatch: (p: Partial<ItemLinha>) => void;
  onVincular: (m: MaterialOption) => void;
  onDesvincular: () => void;
  onRemover: () => void;
  podeRemover: boolean;
}) {
  const subtotal = item.quantidade * item.valor_estimado_unit;
  return (
    <div className="rounded-md border bg-background p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground w-5">{index + 1}</span>
        {item.material_id ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
            <Boxes className="size-3" /> Material do catálogo
            <button
              type="button"
              onClick={onDesvincular}
              aria-label="Desvincular material"
              className="ml-0.5 rounded-full hover:bg-sky-200/70"
            >
              <X className="size-3" />
            </button>
          </span>
        ) : (
          <MaterialPicker materiais={materiais} onPick={onVincular} />
        )}
        {podeRemover ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            onClick={onRemover}
            aria-label="Remover item"
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-12">
        <div className="sm:col-span-6">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Descrição *
          </Label>
          <Input
            value={item.descricao}
            onChange={(e) => onPatch({ descricao: e.target.value })}
            placeholder="Descrição do item"
            readOnly={!!item.material_id}
            className={cn(item.material_id && "bg-muted/50")}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Un.</Label>
          <Input value={item.unidade} onChange={(e) => onPatch({ unidade: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Qtd</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={item.quantidade}
            onChange={(e) => onPatch({ quantidade: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Vlr unit.
          </Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={item.valor_estimado_unit}
            onChange={(e) => onPatch({ valor_estimado_unit: Number(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="text-right text-xs text-muted-foreground tabular-nums">
        Subtotal: {formatBRL(subtotal)}
      </div>
    </div>
  );
}

function MaterialPicker({
  materiais,
  onPick,
}: {
  materiais: MaterialOption[];
  onPick: (m: MaterialOption) => void;
}) {
  const [query, setQuery] = useState("");
  const [aberto, setAberto] = useState(false);
  const resultados = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return [];
    return materiais
      .filter(
        (m) =>
          normalizeSearch(m.descricao).includes(q) ||
          normalizeSearch(m.codigo ?? "").includes(q),
      )
      .slice(0, 8);
  }, [materiais, query]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 h-8 w-64 rounded-md border bg-background px-2.5 text-sm">
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          placeholder="Vincular material do catálogo…"
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
        />
      </div>
      {aberto && resultados.length > 0 ? (
        <ul className="absolute z-10 mt-1 w-72 max-h-56 overflow-y-auto rounded-md border bg-popover shadow-md">
          {resultados.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(m);
                  setQuery("");
                  setAberto(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
              >
                <div className="text-sm font-medium truncate">{m.descricao}</div>
                <div className="text-xs text-muted-foreground">
                  {m.codigo ? `${m.codigo} · ` : ""}
                  {m.unidade_medida} · {formatBRL(m.valor_referencia)}
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
        {label}
      </Label>
      {children}
    </div>
  );
}

const NativeSelect = ({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={cn(
      "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      className,
    )}
  >
    {children}
  </select>
);
