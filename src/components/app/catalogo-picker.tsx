"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Search, X, Wrench, Package, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createMaterial, type MaterialInput } from "@/lib/actions/materiais";
import { createServico, type ServicoInput, type ServicoResumo } from "@/lib/actions/servicos";
import type { MaterialResumo } from "@/lib/actions/orcamentos";

export type CriadoCatalogo =
  | { tipo: "servico"; item: ServicoResumo }
  | { tipo: "material"; item: MaterialResumo };

type Props = {
  servicos: ServicoResumo[];
  materiais: MaterialResumo[];
  /** Valor codificado do item: "srv:<id>" | "mat:<id>" | "". */
  value: string;
  onChange: (value: string) => void;
  /** Chamado quando o usuário cadastra um item novo pelo modal. */
  onCreate?: (criado: CriadoCatalogo) => void;
};

const MAX_RESULTS = 60;

const UNIDADES = ["UN", "m²", "m", "m³", "kg", "L", "par", "cento", "diária", "h", "vb"];

export function CatalogoPicker({
  servicos,
  materiais,
  value,
  onChange,
  onCreate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = useMemo(() => {
    if (value.startsWith("srv:")) {
      const s = servicos.find((x) => x.id === value.slice(4));
      return s ? { tipo: "srv" as const, texto: `${s.codigo} · ${s.descricao}` } : null;
    }
    if (value.startsWith("mat:")) {
      const m = materiais.find((x) => x.id === value.slice(4));
      return m
        ? { tipo: "mat" as const, texto: `${m.codigo ? `${m.codigo} · ` : ""}${m.descricao}` }
        : null;
    }
    return null;
  }, [value, servicos, materiais]);

  // Busca por palavras: cada palavra digitada pode estar em qualquer ordem;
  // acentos são ignorados (normalizeSearch).
  const tokens = useMemo(
    () => normalizeSearch(query.trim()).split(/\s+/).filter(Boolean),
    [query],
  );
  const matchTokens = useMemo(
    () => (texto: string) => {
      if (tokens.length === 0) return true;
      const h = normalizeSearch(texto);
      return tokens.every((t) => h.includes(t));
    },
    [tokens],
  );

  const filtrados = useMemo(() => {
    const srv = servicos.filter((s) => matchTokens(`${s.codigo} ${s.descricao}`));
    const mat = materiais.filter((m) => matchTokens(`${m.codigo ?? ""} ${m.descricao}`));
    return {
      srv: srv.slice(0, MAX_RESULTS),
      mat: mat.slice(0, MAX_RESULTS),
      totalSrv: srv.length,
      totalMat: mat.length,
    };
  }, [matchTokens, servicos, materiais]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function pick(v: string) {
    onChange(v);
    setQuery("");
    setOpen(false);
  }

  function handleCriado(criado: CriadoCatalogo) {
    setModalOpen(false);
    setOpen(false);
    setQuery("");
    onCreate?.(criado);
  }

  return (
    <div ref={containerRef} className="relative">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "h-9 w-full rounded-md border border-input bg-background px-2 text-left text-xs flex items-center gap-2",
            "hover:bg-muted/50 transition-colors",
          )}
        >
          {selectedLabel ? (
            <>
              {selectedLabel.tipo === "srv" ? (
                <Wrench className="size-3.5 shrink-0 text-sky-600" />
              ) : (
                <Package className="size-3.5 shrink-0 text-amber-600" />
              )}
              <span className="flex-1 truncate">{selectedLabel.texto}</span>
              <X
                className="size-3.5 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  pick("");
                }}
              />
            </>
          ) : (
            <>
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-muted-foreground">
                Buscar serviço ou material…
              </span>
            </>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-2 h-9 w-full rounded-md border border-input bg-background px-2 text-xs ring-2 ring-ring/40">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite palavras-chave (ex.: placa R1 0,33)…"
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
          />
        </div>
      )}

      {open ? (
        <div className="absolute z-40 mt-1 w-full min-w-[440px] max-w-[680px] rounded-md border bg-popover shadow-lg overflow-hidden">
          <ul className="max-h-72 overflow-y-auto py-1 text-xs">
            <li>
              <button
                type="button"
                onClick={() => pick("")}
                className="w-full text-left px-3 py-1.5 hover:bg-muted text-muted-foreground italic"
              >
                Item avulso (preencher manual)
              </button>
            </li>

            {filtrados.srv.length > 0 ? (
              <li className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Serviços{" "}
                {filtrados.totalSrv > filtrados.srv.length
                  ? `(${filtrados.srv.length} de ${filtrados.totalSrv})`
                  : `(${filtrados.totalSrv})`}
              </li>
            ) : null}
            {filtrados.srv.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  title={`${s.codigo} · ${s.descricao}`}
                  onClick={() => pick(`srv:${s.id}`)}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-start gap-2"
                >
                  <Wrench className="size-3.5 shrink-0 text-sky-600 mt-0.5" />
                  <span className="font-mono text-[10px] text-muted-foreground shrink-0 mt-0.5">
                    {s.codigo}
                  </span>
                  <span className="flex-1 whitespace-normal break-words leading-snug">
                    {s.descricao}
                  </span>
                </button>
              </li>
            ))}

            {filtrados.mat.length > 0 ? (
              <li className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Materiais{" "}
                {filtrados.totalMat > filtrados.mat.length
                  ? `(${filtrados.mat.length} de ${filtrados.totalMat})`
                  : `(${filtrados.totalMat})`}
              </li>
            ) : null}
            {filtrados.mat.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  title={`${m.codigo ? `${m.codigo} · ` : ""}${m.descricao}`}
                  onClick={() => pick(`mat:${m.id}`)}
                  className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-start gap-2"
                >
                  <Package className="size-3.5 shrink-0 text-amber-600 mt-0.5" />
                  {m.codigo ? (
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0 mt-0.5">
                      {m.codigo}
                    </span>
                  ) : null}
                  <span className="flex-1 whitespace-normal break-words leading-snug">
                    {m.descricao}
                  </span>
                </button>
              </li>
            ))}

            {filtrados.srv.length === 0 && filtrados.mat.length === 0 ? (
              <li className="px-3 py-3 text-center text-muted-foreground">
                Nada encontrado{query ? ` para “${query}”` : ""}.
              </li>
            ) : null}
          </ul>

          <div className="border-t bg-muted/40">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 text-xs font-medium text-primary"
            >
              <Plus className="size-3.5" />
              Cadastrar novo item{query ? ` (“${query}”)` : ""}
            </button>
          </div>
        </div>
      ) : null}

      <NovoItemModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        descricaoInicial={query}
        onCreated={handleCriado}
      />
    </div>
  );
}

/* ===========================================================================
 * Modal: cadastrar serviço ou material rapidamente durante o orçamento
 * ======================================================================== */

function NovoItemModal({
  open,
  onOpenChange,
  descricaoInicial,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  descricaoInicial: string;
  onCreated: (criado: CriadoCatalogo) => void;
}) {
  const [tipo, setTipo] = useState<"material" | "servico">("material");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [unidade, setUnidade] = useState("UN");
  const [valorMaterial, setValorMaterial] = useState("");
  const [valorMaoObra, setValorMaoObra] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setTipo("material");
    setDescricao(descricaoInicial.trim());
    setCategoria("");
    setUnidade("UN");
    setValorMaterial("");
    setValorMaoObra("");
  }, [open, descricaoInicial]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim()) {
      toast.error("Informe a descrição.");
      return;
    }
    const material = Number(valorMaterial) || 0;
    const maoObra = Number(valorMaoObra) || 0;

    startTransition(async () => {
      if (tipo === "material") {
        const input: MaterialInput = {
          descricao: descricao.trim(),
          familia: categoria.trim() || null,
          unidade_medida: unidade,
          valor_referencia: material,
          valor_mao_obra: maoObra,
        };
        const res = await createMaterial(input);
        if (!res.ok) {
          toast.error("Erro ao cadastrar material", { description: res.error });
          return;
        }
        toast.success("Material cadastrado");
        onCreated({
          tipo: "material",
          item: {
            id: res.id,
            codigo: res.codigo,
            descricao: input.descricao,
            unidade_medida: unidade,
            valor_referencia: material,
            valor_mao_obra: maoObra,
          },
        });
      } else {
        const input: ServicoInput = {
          descricao: descricao.trim(),
          descricao_completa: descricao.trim(),
          categoria: categoria.trim() || null,
          unidade_padrao: unidade,
          preco_unitario: maoObra || material,
        };
        const res = await createServico(input);
        if (!res.ok) {
          toast.error("Erro ao cadastrar serviço", { description: res.error });
          return;
        }
        toast.success("Serviço cadastrado");
        onCreated({
          tipo: "servico",
          item: {
            id: res.id,
            codigo: res.codigo,
            descricao: input.descricao,
            descricao_completa: input.descricao,
            unidade_padrao: unidade,
            preco_unitario: maoObra || material,
          },
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Cadastrar novo item</DialogTitle>
          <DialogDescription>
            Cadastre na hora um serviço ou material. Ele entra no catálogo e já é
            selecionado neste item do orçamento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            {(["material", "servico"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={cn(
                  "flex-1 h-9 rounded-md border text-sm font-medium transition-colors",
                  tipo === t
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted",
                )}
              >
                {t === "material" ? "Material" : "Serviço"}
              </button>
            ))}
          </div>

          <ModalField label="Descrição *">
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Placa R-1 chapa de aço 1,25mm, película GTP I, Ø 0,50m"
              autoFocus
            />
          </ModalField>

          <div className="grid gap-3 sm:grid-cols-2">
            <ModalField label={tipo === "material" ? "Família" : "Categoria"}>
              <Input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder={
                  tipo === "material"
                    ? "Ex.: Sinalização vertical"
                    : "Ex.: Sinalização vertical"
                }
              />
            </ModalField>
            <ModalField label="Unidade">
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </ModalField>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ModalField
              label={tipo === "material" ? "Preço do material (R$)" : "Preço (R$)"}
            >
              <Input
                type="number"
                step="0.01"
                value={valorMaterial}
                onChange={(e) => setValorMaterial(e.target.value)}
                placeholder="0,00"
                className="text-right tabular-nums"
              />
            </ModalField>
            {tipo === "material" ? (
              <ModalField label="Instalação / MO (R$)">
                <Input
                  type="number"
                  step="0.01"
                  value={valorMaoObra}
                  onChange={(e) => setValorMaoObra(e.target.value)}
                  placeholder="0,00"
                  className="text-right tabular-nums"
                />
              </ModalField>
            ) : null}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Você pode deixar os preços em branco e ajustar depois em Cadastros.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Cadastrar e usar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ModalField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
        {label}
      </Label>
      {children}
    </div>
  );
}
