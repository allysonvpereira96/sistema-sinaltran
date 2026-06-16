"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { VencimentoRow } from "@/lib/types/rh";
import { classificarDias, prazoLabel, VENC_LABEL, VENC_TONE, type VencStatus } from "@/lib/vencimentos";
import { formatDateBR, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_FILTROS: { value: VencStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "vencido", label: "Vencidos" },
  { value: "urgente", label: "Vence em breve" },
  { value: "atencao", label: "Atenção" },
  { value: "ok", label: "Em dia" },
];

export function VencimentosLista({ rows }: { rows: VencimentoRow[] }) {
  const [busca, setBusca] = useState("");
  const [statusSel, setStatusSel] = useState<VencStatus | "todos">("todos");
  const [tipoSel, setTipoSel] = useState<string>("todos");
  const [setorSel, setSetorSel] = useState<string>("todos");

  const tipos = useMemo(
    () => ["todos", ...Array.from(new Set(rows.map((r) => r.tipo)))],
    [rows],
  );
  const setores = useMemo(
    () => ["todos", ...Array.from(new Set(rows.map((r) => r.setor).filter(Boolean) as string[]))],
    [rows],
  );

  const comStatus = useMemo(
    () => rows.map((r) => ({ ...r, _status: classificarDias(r.dias_para_vencer) })),
    [rows],
  );

  const kpis = useMemo(() => {
    const acc: Record<VencStatus, number> = { vencido: 0, urgente: 0, atencao: 0, ok: 0, sem_data: 0 };
    for (const r of comStatus) acc[r._status]++;
    return acc;
  }, [comStatus]);

  const filtradas = useMemo(() => {
    const q = normalizeSearch(busca);
    return comStatus.filter((r) => {
      if (statusSel !== "todos" && r._status !== statusSel) return false;
      if (tipoSel !== "todos" && r.tipo !== tipoSel) return false;
      if (setorSel !== "todos" && r.setor !== setorSel) return false;
      if (q && !normalizeSearch(`${r.colaborador} ${r.descricao}`).includes(q)) return false;
      return true;
    });
  }, [comStatus, busca, statusSel, tipoSel, setorSel]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Vencidos" value={kpis.vencido} status="vencido" onClick={() => setStatusSel("vencido")} active={statusSel === "vencido"} />
        <KpiCard label="Vence em breve" value={kpis.urgente} status="urgente" detail="próx. 30 dias" onClick={() => setStatusSel("urgente")} active={statusSel === "urgente"} />
        <KpiCard label="Atenção" value={kpis.atencao} status="atencao" detail="próx. 60 dias" onClick={() => setStatusSel("atencao")} active={statusSel === "atencao"} />
        <KpiCard label="Em dia" value={kpis.ok} status="ok" onClick={() => setStatusSel("ok")} active={statusSel === "ok"} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar colaborador…" className="pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filtro options={STATUS_FILTROS.map((s) => ({ value: s.value, label: s.label }))} value={statusSel} onChange={(v) => setStatusSel(v as VencStatus | "todos")} />
          <Select value={tipoSel} onChange={setTipoSel} options={tipos} placeholder="Tipo" />
          <Select value={setorSel} onChange={setSetorSel} options={setores} placeholder="Setor" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {filtradas.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <CalendarClock className="size-8 opacity-40" />
              <p className="text-sm">Nenhum vencimento para os filtros selecionados.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((r) => {
                  const tone = VENC_TONE[r._status];
                  return (
                    <TableRow key={`${r.tipo}-${r.registro_id}`}>
                      <TableCell className="text-sm font-medium">
                        <Link href={`/pessoal/colaboradores/${r.colaborador_id}`} className="hover:underline">
                          {r.colaborador}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.setor ?? "—"}</TableCell>
                      <TableCell className="text-sm">{r.tipo}</TableCell>
                      <TableCell className="text-sm">{r.descricao}</TableCell>
                      <TableCell className="text-sm">
                        {formatDateBR(r.vencimento)}
                        <span className="block text-xs text-muted-foreground">{prazoLabel(r.dias_para_vencer)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("gap-1.5 font-medium", tone.bg, tone.text)}>
                          <span className={cn("size-1.5 rounded-full", tone.dot)} />
                          {VENC_LABEL[r._status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
  status,
  detail,
  onClick,
  active,
}: {
  label: string;
  value: number;
  status: VencStatus;
  detail?: string;
  onClick: () => void;
  active: boolean;
}) {
  const tone = VENC_TONE[status];
  return (
    <button onClick={onClick} className="text-left">
      <Card className={cn("transition-shadow hover:shadow-md", active && "ring-2 ring-primary")}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
              <div className="text-2xl font-bold mt-2 tabular-nums">{value}</div>
              {detail ? <div className="text-xs text-muted-foreground mt-1">{detail}</div> : null}
            </div>
            <span className={cn("size-3 rounded-full mt-1", tone.dot)} />
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function Filtro({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === o.value ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:bg-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-input bg-background px-2.5 text-xs"
      aria-label={placeholder}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o === "todos" ? `${placeholder}: todos` : o}
        </option>
      ))}
    </select>
  );
}
