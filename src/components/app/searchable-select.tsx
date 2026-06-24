"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronsUpDown, Check, X } from "lucide-react";
import { normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SearchableOption = {
  value: string;
  label: string;
  /** Texto secundário (ex.: código, cidade) — exibido e também pesquisável. */
  hint?: string;
};

/**
 * Select com busca por digitação — para listas grandes (fornecedores, clientes,
 * colaboradores, obras…). Substitui o `<select>` nativo.
 * Regra de UX do sistema: ver memória `feedback-searchable-selects`.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione…",
  emptyLabel = "Nada encontrado.",
  allowClear = true,
  disabled = false,
  className,
  id,
}: {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [query, setQuery] = useState("");
  const [destaque, setDestaque] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selecionado = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  const filtradas = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return options.slice(0, 50);
    return options
      .filter(
        (o) =>
          normalizeSearch(o.label).includes(q) ||
          normalizeSearch(o.hint ?? "").includes(q),
      )
      .slice(0, 50);
  }, [options, query]);

  // fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [aberto]);

  // foca o input ao abrir
  useEffect(() => {
    if (aberto) requestAnimationFrame(() => inputRef.current?.focus());
  }, [aberto]);

  function abrir() {
    setQuery("");
    setDestaque(0);
    setAberto(true);
  }

  function escolher(v: string) {
    onChange(v);
    setAberto(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDestaque((d) => Math.min(d + 1, filtradas.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDestaque((d) => Math.max(d - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const op = filtradas[destaque];
      if (op) escolher(op.value);
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span
          className={cn(
            "flex-1 truncate text-left",
            selecionado ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {selecionado ? selecionado.label : placeholder}
        </span>
        {allowClear && selecionado && !disabled ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Limpar"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted"
          >
            <X className="size-3.5" />
          </span>
        ) : null}
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {aberto ? (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="flex items-center gap-2 border-b px-2.5 py-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setDestaque(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Digite para buscar…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtradas.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</li>
            ) : (
              filtradas.map((o, i) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onMouseEnter={() => setDestaque(i)}
                    onClick={() => escolher(o.value)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
                      i === destaque ? "bg-muted" : "hover:bg-muted",
                    )}
                  >
                    <Check
                      className={cn(
                        "size-3.5 shrink-0",
                        o.value === value ? "opacity-100 text-primary" : "opacity-0",
                      )}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{o.label}</span>
                      {o.hint ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {o.hint}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
