"use client";

import { useMemo, useState } from "react";
import { Search, AlertTriangle, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MaterialEstoque, MaterialMovimentacao } from "@/lib/actions/almoxarifado-materiais";
import { formatBRL, formatDateBR, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AlmoxView({
  estoque,
  movimentacoes,
  empresaNome,
}: {
  estoque: MaterialEstoque[];
  movimentacoes: MaterialMovimentacao[];
  empresaNome?: string | null;
}) {
  const [busca, setBusca] = useState("");
  const [soAlerta, setSoAlerta] = useState(false);

  const filtrado = useMemo(() => {
    const q = normalizeSearch(busca);
    return estoque.filter((m) => {
      if (soAlerta && !m.abaixo_minimo) return false;
      if (
        q &&
        !normalizeSearch(m.descricao).includes(q) &&
        !normalizeSearch(m.codigo ?? "").includes(q)
      )
        return false;
      return true;
    });
  }, [estoque, busca, soAlerta]);

  const abaixo = estoque.filter((m) => m.abaixo_minimo).length;
  const valorTotal = estoque.reduce(
    (a, m) => a + m.quantidade_atual * m.valor_referencia,
    0,
  );

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
      <PageHeader
        title={empresaNome ? `Almoxarifado · ${empresaNome}` : "Almoxarifado de materiais"}
        description="Saldo de estoque dos materiais da empresa ativa. A entrada vem da entrega das compras e a saída é a retirada para a obra. Troque a empresa no seletor da topbar."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Itens em catálogo" value={String(estoque.length)} />
        <KpiCard label="Abaixo do mínimo" value={String(abaixo)} alerta={abaixo > 0} />
        <KpiCard label="Valor em estoque" value={formatBRL(valorTotal)} />
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 h-10 w-full sm:w-80 rounded-md border bg-background px-3 text-sm">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar material…"
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
            />
          </div>
          <button
            type="button"
            onClick={() => setSoAlerta((v) => !v)}
            aria-pressed={soAlerta}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              soAlerta
                ? "border-transparent bg-amber-500 text-white"
                : "border-input bg-background hover:bg-muted",
            )}
          >
            <AlertTriangle className="size-3.5" />
            Só abaixo do mínimo
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Un.</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Vlr. ref.</TableHead>
                <TableHead className="text-right">Valor em estoque</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrado.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    Nenhum material encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtrado.map((m) => (
                  <TableRow key={m.material_id}>
                    <TableCell>
                      <div className="font-medium">{m.descricao}</div>
                      {m.codigo ? (
                        <div className="text-xs text-muted-foreground font-mono">{m.codigo}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{m.unidade_medida}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {m.abaixo_minimo ? (
                          <AlertTriangle className="size-3.5 text-amber-500" />
                        ) : null}
                        {m.quantidade_atual}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {m.estoque_minimo || "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(m.valor_referencia)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(m.quantidade_atual * m.valor_referencia)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimentações recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {movimentacoes.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              Nenhuma movimentação registrada ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead>Obra / Motivo</TableHead>
                  <TableHead>NF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimentacoes.map((mv) => (
                  <TableRow key={mv.id}>
                    <TableCell className="tabular-nums whitespace-nowrap text-sm">
                      {formatDateBR(mv.created_at)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{mv.material_descricao}</TableCell>
                    <TableCell>
                      {mv.tipo === "entrada" ? (
                        <Badge variant="secondary" className="gap-1 bg-emerald-50 text-emerald-700">
                          <ArrowDownCircle className="size-3" /> Entrada
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 bg-rose-50 text-rose-700">
                          <ArrowUpCircle className="size-3" /> Saída
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{mv.quantidade}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {mv.obra_nome ?? mv.motivo ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {mv.numero_nf ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  alerta,
}: {
  label: string;
  value: string;
  alerta?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </div>
        <div className={cn("text-2xl font-bold mt-2 tabular-nums", alerta && "text-amber-600")}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
