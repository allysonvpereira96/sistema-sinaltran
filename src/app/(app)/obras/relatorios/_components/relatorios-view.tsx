"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  HardHat,
  Users,
  Truck,
  Route,
  CalendarRange,
  ClipboardList,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RelatorioOS } from "@/lib/actions/relatorios-os";
import { formatNumber, formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function presets() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const mesIni = iso(new Date(Date.UTC(y, m, 1)));
  const ult90 = iso(new Date(Date.UTC(y, m, now.getUTCDate() - 89)));
  const anoIni = iso(new Date(Date.UTC(y, 0, 1)));
  const hoje = iso(now);
  return [
    { label: "Este mês", inicio: mesIni, fim: hoje },
    { label: "Últimos 90 dias", inicio: ult90, fim: hoje },
    { label: "Este ano", inicio: anoIni, fim: hoje },
  ];
}

const kmFmt = (n: number) => `${formatNumber(n)} km`;

export function RelatoriosObraView({ relatorio }: { relatorio: RelatorioOS }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inicio, setInicio] = useState(relatorio.periodo.inicio);
  const [fim, setFim] = useState(relatorio.periodo.fim);

  function aplicar(ini: string, f: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("inicio", ini);
    params.set("fim", f);
    router.push(`/obras/relatorios?${params.toString()}`);
  }

  const { resumo, obras, colaboradores, frota } = relatorio;

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
      <PageHeader
        title="Relatórios de obra"
        description="Indicadores operacionais extraídos das Ordens de Serviço — obras, colaboradores e frota."
      />

      {/* Filtro de período */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                Início
              </label>
              <Input
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                Fim
              </label>
              <Input
                type="date"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={() => aplicar(inicio, fim)} className="gap-2">
              <CalendarRange className="size-4" />
              Aplicar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets().map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setInicio(p.inicio);
                  setFim(p.fim);
                  aplicar(p.inicio, p.fim);
                }}
                className="inline-flex items-center rounded-full border border-input bg-background px-3 py-1 text-xs font-semibold hover:bg-muted transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Ordens de serviço" value={String(resumo.os_count)} icon={ClipboardList} />
        <Kpi label="Obras com atividade" value={String(resumo.obras)} icon={HardHat} />
        <Kpi label="Colaboradores em campo" value={String(resumo.colaboradores)} icon={Users} />
        <Kpi label="Veículos utilizados" value={String(resumo.veiculos)} icon={Truck} />
        <Kpi label="Km rodados" value={kmFmt(resumo.km_total)} icon={Route} />
      </div>

      {resumo.os_count === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Nenhuma O.S registrada neste período. Ajuste o filtro acima.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="obras">
          <TabsList>
            <TabsTrigger value="obras">Obras</TabsTrigger>
            <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
            <TabsTrigger value="frota">Frota</TabsTrigger>
          </TabsList>

          {/* ---- Obras ---- */}
          <TabsContent value="obras">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Obra</TableHead>
                      <TableHead className="text-right">O.S</TableHead>
                      <TableHead className="text-right">Dias-equipe</TableHead>
                      <TableHead className="text-right">Km</TableHead>
                      <TableHead>Cidades</TableHead>
                      <TableHead>Período</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {obras.map((o) => (
                      <TableRow key={o.obra_id}>
                        <TableCell>
                          <div className="font-medium">{o.nome}</div>
                          <div className="text-xs text-muted-foreground">
                            <span className="font-mono">{o.numero}</span>
                            {o.cliente_nome ? ` · ${o.cliente_nome}` : ""}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{o.os_count}</TableCell>
                        <TableCell className="text-right tabular-nums">{o.dias_equipe}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(o.km_total)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {o.cidades.length ? o.cidades.join(", ") : "—"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDateBR(o.primeira)} → {formatDateBR(o.ultima)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- Colaboradores ---- */}
          <TabsContent value="colaboradores">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead className="text-right">Dias em campo</TableHead>
                      <TableHead className="text-right">Obras</TableHead>
                      <TableHead className="text-right">Como encarregado</TableHead>
                      <TableHead className="text-right">Como motorista</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {colaboradores.map((c) => (
                      <TableRow key={c.colaborador_id}>
                        <TableCell>
                          <div className="font-medium">{c.nome}</div>
                          {c.cargo ? (
                            <div className="text-xs text-muted-foreground">{c.cargo}</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {c.dias}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{c.obras}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.como_encarregado || "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.como_motorista || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- Frota ---- */}
          <TabsContent value="frota">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead className="text-right">Km rodados</TableHead>
                      <TableHead className="text-right">Dias em uso</TableHead>
                      <TableHead className="text-right">Obras</TableHead>
                      <TableHead className="text-right">Motoristas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {frota.map((v) => (
                      <TableRow key={v.veiculo_id}>
                        <TableCell>
                          <div className="font-medium">{v.descricao}</div>
                          <div className="text-xs text-muted-foreground">
                            <span className="font-mono">{v.codigo}</span>
                            {v.placa ? (
                              <Badge
                                variant="secondary"
                                className="ml-2 bg-slate-100 text-slate-700 font-mono text-[10px]"
                              >
                                {v.placa}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {kmFmt(v.km_total)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{v.dias}</TableCell>
                        <TableCell className="text-right tabular-nums">{v.obras}</TableCell>
                        <TableCell className="text-right tabular-nums">{v.motoristas}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {label}
            </div>
            <div className="text-2xl font-bold mt-2 tabular-nums">{value}</div>
          </div>
          <div className={cn("size-10 rounded-lg grid place-items-center bg-primary/10")}>
            <Icon className="size-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
