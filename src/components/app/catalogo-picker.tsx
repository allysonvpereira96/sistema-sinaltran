"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Wrench, Package } from "lucide-react";
import { normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ServicoResumo } from "@/lib/actions/servicos";
import type { MaterialResumo } from "@/lib/actions/orcamentos";

type Props = {
  servicos: ServicoResumo[];
  materiais: MaterialResumo[];
  /** Valor codificado do item: "srv:<id>" | "mat:<id>" | "". */
  value: string;
  onChange: (value: string) => void;
};

const MAX_RESULTS = 60;

export function CatalogoPicker({ servicos, materiais, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rótulo do item atualmente selecionado (para exibir no botão).
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

  const filtrados = useMemo(() => {
    const q = normalizeSearch(query.trim());
    const matchS = (s: ServicoResumo) =>
      !q ||
      normalizeSearch(s.codigo).includes(q) ||
      normalizeSearch(s.descricao).includes(q);
    const matchM = (m: MaterialResumo) =>
      !q ||
      normalizeSearch(m.codigo ?? "").includes(q) ||
      normalizeSearch(m.descricao).includes(q);
    const srv = servicos.filter(matchS);
    const mat = materiais.filter(matchM);
    return {
      srv: srv.slice(0, MAX_RESULTS),
      mat: mat.slice(0, MAX_RESULTS),
      totalSrv: srv.length,
      totalMat: mat.length,
    };
  }, [query, servicos, materiais]);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Foca o campo de busca ao abrir.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function pick(v: string) {
    onChange(v);
    setQuery("");
    setOpen(false);
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
            placeholder="Digite código ou descrição…"
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
              <li className="px-3 py-4 text-center text-muted-foreground">
                Nada encontrado para “{query}”.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
