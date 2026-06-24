"use client";

import { useMemo, useState } from "react";
import { Cake, Printer, Download } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Colaborador } from "@/lib/mocks/colaboradores";
import type { EmpresaResumo } from "@/lib/actions/orcamentos";
import { formatTelefone } from "@/lib/format";
import { cn } from "@/lib/utils";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Relatórios disponíveis (estruturado para crescer). */
const RELATORIOS = [{ value: "aniversariantes", label: "Aniversariantes do mês" }] as const;
type RelatorioTipo = (typeof RELATORIOS)[number]["value"];

type Aniversariante = {
  id: string;
  dia: number;
  nome: string;
  cargo: string;
  setor: string | null;
  telefone: string | null;
  empresa: string;
  idadeQueFaz: number | null;
};

export function RelatoriosRhView({
  colaboradores,
  empresas,
}: {
  colaboradores: Colaborador[];
  empresas: EmpresaResumo[];
}) {
  const agora = new Date();
  const [relatorio, setRelatorio] = useState<RelatorioTipo>("aniversariantes");
  const [mes, setMes] = useState<number>(agora.getMonth() + 1); // 1-12
  const [empresaId, setEmpresaId] = useState<string>("todas");
  const [incluirDesligados, setIncluirDesligados] = useState(false);

  const empresaById = useMemo(
    () => new Map(empresas.map((e) => [e.id, e.nome])),
    [empresas],
  );
  const multiEmpresa = empresas.length > 1;

  // Escopo: empresa selecionada + (opcional) excluir desligados
  const escopo = useMemo(
    () =>
      colaboradores.filter((c) => {
        if (empresaId !== "todas" && c.empresa_id !== empresaId) return false;
        if (!incluirDesligados && c.status === "desligado") return false;
        return true;
      }),
    [colaboradores, empresaId, incluirDesligados],
  );

  const aniversariantes = useMemo<Aniversariante[]>(() => {
    return escopo
      .filter((c) => {
        const m = (c.data_nascimento ?? "").slice(5, 7);
        return Number(m) === mes;
      })
      .map((c) => {
        const nasc = c.data_nascimento ?? "";
        const dia = Number(nasc.slice(8, 10));
        const ano = Number(nasc.slice(0, 4));
        return {
          id: c.id,
          dia,
          nome: c.nome_completo,
          cargo: c.cargo,
          setor: c.setor ?? null,
          telefone: c.telefone,
          empresa: c.empresa_id ? empresaById.get(c.empresa_id) ?? "—" : "—",
          idadeQueFaz: ano ? agora.getFullYear() - ano : null,
        };
      })
      .sort((a, b) => a.dia - b.dia || a.nome.localeCompare(b.nome));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escopo, mes, empresaById]);

  const semData = useMemo(
    () => escopo.filter((c) => !c.data_nascimento).length,
    [escopo],
  );

  function exportarCSV() {
    const sep = ";";
    const esc = (s: string | number | null) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const head = ["Dia", "Nome", "Cargo", "Setor", "Telefone", "Idade (faz)"];
    if (multiEmpresa) head.push("Empresa");
    const linhas = aniversariantes.map((a) => {
      const cols = [
        String(a.dia).padStart(2, "0"),
        a.nome,
        a.cargo,
        a.setor ?? "",
        formatTelefone(a.telefone),
        a.idadeQueFaz ?? "",
      ];
      if (multiEmpresa) cols.push(a.empresa);
      return cols.map(esc).join(sep);
    });
    const csv = "﻿" + [head.map(esc).join(sep), ...linhas].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aniversariantes-${String(mes).padStart(2, "0")}-${MESES[mes - 1].toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
      <PageHeader
        title="Relatórios"
        description="Relatórios do Departamento Pessoal extraídos do cadastro de colaboradores."
      />

      {/* Filtros */}
      <Card className="print:hidden">
        <CardContent className="p-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                Relatório
              </label>
              <select
                value={relatorio}
                onChange={(e) => setRelatorio(e.target.value as RelatorioTipo)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-56"
              >
                {RELATORIOS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {relatorio === "aniversariantes" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                  Mês
                </label>
                <select
                  value={mes}
                  onChange={(e) => setMes(Number(e.target.value))}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm w-40"
                >
                  {MESES.map((nome, i) => (
                    <option key={nome} value={i + 1}>
                      {nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm h-9">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                checked={incluirDesligados}
                onChange={(e) => setIncluirDesligados(e.target.checked)}
              />
              Incluir desligados
            </label>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={exportarCSV} disabled={aniversariantes.length === 0}>
                <Download className="size-4" />
                Exportar CSV
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => window.print()} disabled={aniversariantes.length === 0}>
                <Printer className="size-4" />
                Imprimir / PDF
              </Button>
            </div>
          </div>

          {multiEmpresa && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empresa</span>
              <div className="inline-flex rounded-md border p-0.5">
                <button
                  type="button"
                  onClick={() => setEmpresaId("todas")}
                  className={cn("px-3 py-1.5 text-xs font-semibold rounded transition-colors", empresaId === "todas" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                >
                  Todas
                </button>
                {empresas.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setEmpresaId(e.id)}
                    className={cn("px-3 py-1.5 text-xs font-semibold rounded transition-colors", empresaId === e.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                  >
                    {e.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cabeçalho do relatório (visível na impressão) */}
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-xl bg-primary/10 grid place-items-center shrink-0 print:hidden">
          <Cake className="size-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Aniversariantes de {MESES[mes - 1]}
          </h2>
          <p className="text-sm text-muted-foreground">
            {aniversariantes.length} colaborador(es)
            {empresaId !== "todas" ? ` · ${empresaById.get(empresaId) ?? ""}` : ""}
            {semData > 0 ? ` · ${semData} sem data de nascimento cadastrada` : ""}
          </p>
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {aniversariantes.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Cake className="size-8 opacity-40" />
              <p className="text-sm">Nenhum aniversariante em {MESES[mes - 1]}.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Dia</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-center">Faz</TableHead>
                  {multiEmpresa && <TableHead>Empresa</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {aniversariantes.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono bg-primary/10 text-primary">
                        {String(a.dia).padStart(2, "0")}/{String(mes).padStart(2, "0")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{a.nome}</TableCell>
                    <TableCell className="text-sm">{a.cargo}</TableCell>
                    <TableCell className="text-sm">{a.setor ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatTelefone(a.telefone)}</TableCell>
                    <TableCell className="text-center text-sm tabular-nums">
                      {a.idadeQueFaz != null ? `${a.idadeQueFaz}` : "—"}
                    </TableCell>
                    {multiEmpresa && <TableCell className="text-sm">{a.empresa}</TableCell>}
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
