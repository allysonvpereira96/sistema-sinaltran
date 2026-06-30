"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, FileText, Fuel, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { salvarCombustivel, type CombustivelLinha, type CombustivelConfig } from "@/lib/actions/beneficios";
import { formatBRL, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CombustivelView({
  competencia,
  config: configInicial,
  linhas,
}: {
  competencia: string;
  config: CombustivelConfig;
  linhas: CombustivelLinha[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [diasUteis, setDiasUteis] = useState(String(configInicial.dias_uteis));
  const [valorDia, setValorDia] = useState(String(configInicial.valor_dia));
  const [dados, setDados] = useState<CombustivelLinha[]>(linhas);
  const [salvando, setSalvando] = useState(false);

  const vd = Number(valorDia) || 0;
  const totalLinha = useCallback(
    (l: CombustivelLinha) => (l.recebe ? Math.max(0, l.dias_trabalhados * vd) : 0),
    [vd],
  );
  const totalGeral = useMemo(() => dados.reduce((s, l) => s + totalLinha(l), 0), [dados, totalLinha]);

  const filtradas = useMemo(() => {
    const q = normalizeSearch(busca);
    return dados.filter((l) => !q || normalizeSearch(`${l.nome} ${l.matricula ?? ""}`).includes(q));
  }, [dados, busca]);

  function patch(id: string, p: Partial<CombustivelLinha>) {
    setDados((d) => d.map((l) => (l.colaborador_id === id ? { ...l, ...p } : l)));
  }
  function trocarMes(ym: string) {
    router.push(`/pessoal/beneficios/combustivel?competencia=${ym}`);
  }

  async function salvar() {
    setSalvando(true);
    const res = await salvarCombustivel(
      competencia,
      { dias_uteis: Number(diasUteis) || 0, valor_dia: vd },
      dados.map((l) => ({ colaborador_id: l.colaborador_id, recebe: l.recebe, dias_trabalhados: l.dias_trabalhados, faltas: l.faltas, observacao: l.observacao })),
    );
    setSalvando(false);
    if (!res.ok) { toast.error("Erro ao salvar", { description: res.error }); return; }
    toast.success("Competência salva");
    router.refresh();
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1300px] mx-auto space-y-6">
      <PageHeader
        title="Combustível"
        description="Dias úteis × valor/dia, descontando faltas (do caderno) e ajustes do mês anterior."
        actions={<Button onClick={salvar} disabled={salvando} className="gap-2"><Save className="size-4" />{salvando ? "Salvando…" : "Salvar competência"}</Button>}
      />

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Competência</Label>
            <Input type="month" value={competencia} onChange={(e) => e.target.value && trocarMes(e.target.value)} className="h-9 w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Dias úteis</Label>
            <Input type="number" min="0" value={diasUteis} onChange={(e) => setDiasUteis(e.target.value)} className="h-9 w-24" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Valor/dia</Label>
            <Input type="number" step="0.01" value={valorDia} onChange={(e) => setValorDia(e.target.value)} className="h-9 w-24" />
          </div>
          <div className="flex items-center gap-2 h-9 w-full lg:w-64 rounded-md border bg-background px-3 text-sm">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar colaborador…" className="flex-1 bg-transparent outline-none" />
          </div>
          <div className="ml-auto text-right">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total da competência</div>
            <div className="text-xl font-bold tabular-nums flex items-center gap-1.5"><Fuel className="size-4 text-muted-foreground" />{formatBRL(totalGeral)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead className="text-center">Faltas</TableHead>
                <TableHead className="text-center">Recebe?</TableHead>
                <TableHead className="text-center w-28">Dias trabalhados</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead className="w-14 text-right">Recibo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">Nenhum colaborador ativo na empresa selecionada.</TableCell></TableRow>
              ) : (
                filtradas.map((l) => (
                  <TableRow key={l.colaborador_id}>
                    <TableCell>
                      <div className="font-medium">{l.nome}</div>
                      <div className="text-xs text-muted-foreground font-mono">mat. {l.matricula ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      <span className={cn(l.faltas > 0 && "text-rose-600 font-semibold")}>{l.faltas}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex rounded-md border p-0.5">
                        <button type="button" onClick={() => patch(l.colaborador_id, { recebe: true })} className={cn("px-3 py-1 text-xs font-semibold rounded", l.recebe ? "bg-emerald-600 text-white" : "hover:bg-muted")}>Sim</button>
                        <button type="button" onClick={() => patch(l.colaborador_id, { recebe: false })} className={cn("px-3 py-1 text-xs font-semibold rounded", !l.recebe ? "bg-rose-600 text-white" : "hover:bg-muted")}>Não</button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        value={l.dias_trabalhados}
                        onChange={(e) => patch(l.colaborador_id, { dias_trabalhados: Number(e.target.value) })}
                        disabled={!l.recebe}
                        className="h-8 w-20 mx-auto text-center"
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatBRL(totalLinha(l))}</TableCell>
                    <TableCell>
                      <Input value={l.observacao ?? ""} onChange={(e) => patch(l.colaborador_id, { observacao: e.target.value })} placeholder="Ex.: não recebe, usa veículo…" className="h-8" />
                    </TableCell>
                    <TableCell className="text-right">
                      {l.recebe && l.lancado ? (
                        <a href={`/pessoal/beneficios/recibo?tipo=combustivel&colaborador=${l.colaborador_id}&competencia=${competencia}`} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))} title="Recibo">
                          <FileText className="size-3.5" />
                        </a>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        “Dias trabalhados” já vem sugerido (dias úteis − faltas); ajuste à mão para extras ou desconto do mês anterior (pode ficar negativo → R$ 0). Salve para liberar os recibos.
      </p>
      <Badge variant="secondary" className="bg-muted text-muted-foreground">{dados.filter((l) => l.recebe).length} recebem</Badge>
    </div>
  );
}
