"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search, MoreHorizontal, FileX } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { normalizeSearch } from "@/lib/format";

export type DataListColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (item: T) => ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
};

export type DataListAction<T> = {
  /** Texto fixo ou função do item (para rótulos condicionais, ex.: Inativar/Reativar). */
  label: ReactNode | ((item: T) => ReactNode);
  onClick: (item: T) => void;
  destructive?: boolean;
};

type DataListProps<T> = {
  items: T[];
  columns: DataListColumn<T>[];
  searchPlaceholder?: string;
  searchFields?: (keyof T | ((item: T) => string | null | undefined))[];
  actions?: DataListAction<T>[];
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: ReactNode;
  getRowKey: (item: T) => string;
};

const alignClass = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

export function DataList<T>({
  items,
  columns,
  searchPlaceholder = "Buscar…",
  searchFields,
  actions,
  emptyTitle = "Nenhum registro encontrado",
  emptyDescription = "Comece adicionando o primeiro registro ou ajuste os filtros.",
  toolbar,
  getRowKey,
}: DataListProps<T>) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = normalizeSearch(search);
    if (!q) return items;
    return items.filter((item) => {
      if (!searchFields || searchFields.length === 0) {
        return normalizeSearch(JSON.stringify(item)).includes(q);
      }
      return searchFields.some((field) => {
        const raw =
          typeof field === "function"
            ? field(item)
            : ((item as Record<string, unknown>)[field as string] as
                | string
                | null
                | undefined);
        if (raw == null) return false;
        return normalizeSearch(String(raw)).includes(q);
      });
    });
  }, [items, search, searchFields]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 h-10 w-full sm:w-80 rounded-md border bg-card px-3 text-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/70"
          />
        </div>
        {toolbar ? <div className="flex items-center gap-2">{toolbar}</div> : null}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`${col.align ? alignClass[col.align] : ""} ${col.className ?? ""}`}
                >
                  {col.header}
                </TableHead>
              ))}
              {actions && actions.length > 0 ? (
                <TableHead className="w-12" />
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions?.length ? 1 : 0)}
                  className="py-16"
                >
                  <div className="flex flex-col items-center justify-center text-center gap-2">
                    <div className="size-12 grid place-items-center rounded-full bg-muted">
                      <FileX className="size-5 text-muted-foreground" />
                    </div>
                    <div className="font-semibold">{emptyTitle}</div>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      {emptyDescription}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={getRowKey(item)}>
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={`${col.align ? alignClass[col.align] : ""} ${col.className ?? ""}`}
                    >
                      {col.cell(item)}
                    </TableCell>
                  ))}
                  {actions && actions.length > 0 ? (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" aria-label="Ações">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          {actions.map((a, i) => (
                            <DropdownMenuItem
                              key={i}
                              onClick={() => a.onClick(item)}
                              variant={a.destructive ? "destructive" : "default"}
                            >
                              {typeof a.label === "function" ? a.label(item) : a.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="text-xs text-muted-foreground">
        {filtered.length} de {items.length} registros
      </div>
    </div>
  );
}
