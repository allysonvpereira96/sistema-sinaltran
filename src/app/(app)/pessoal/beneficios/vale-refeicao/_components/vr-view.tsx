"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, FileText, UtensilsCrossed, Search, CalendarDays, Plane } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { salvarVr, type VrLinha } from "@/lib/actions/beneficios";
import {
  saldoSemana, semanaVazia, totalVrLinha, type VrConfig, type VrSemana,
} from "@/lib/beneficios/vr-calc";
import { formatBRL, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";

export function VrView({
  competencia,
  config: configInicial,
  linhas,
}: {
  competencia: string;
  config: VrConfig;
  linhas: VrLinha[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [cfg, setCfg] = useState<VrConfig>(configInicial);
  const [dados, setDados] = useState<VrLinha[]>(linhas);
  const [salvando, setSalvando] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const totalLinha = useCallback((l: VrLinha) => totalVrLinha(l.semanas, cfg), [cfg]);
  const totalGeral = useMemo(() => dados.reduce((s, l) => s + totalLinha(l), 0), [dados, totalLinha]);

  const filtradas = useMemo(() => {
    const q = normalizeSearch(busca);
    return dados.filter((l) => !q || normalizeSearch(`${l.nome} ${l.matricula ?? ""}`).includes(q));
  }, [dados, busca]);

  const editando = dados.find((l) => l.colaborador_id === editId) ?? null;

  function setCfgNum(k: keyof VrConfig, v: string) {
    setCfg((c) => ({ ...c, [k]: Number(v) || 0 }));
  }
  function aplicarSemanas(id: string, semanas: VrSemana[], valorPadrao: number) {
    setDados((d) => d.map((l) => (l.colaborador_id === id ? { ...l, semanas, valor_dia_padrao: valorPadrao } : l)));
  }
  function setPadrao(id: string, v: number) {
    setDados((d) => d.map((l) => (l.colaborador_id === id ? { ...l, valor_dia_padrao: v } : l)));
  }
  function trocarMes(ym: string) {
    router.push(`/pessoal/beneficios/vale-refeicao?competencia=${ym}`);
  }

  async function salvar() {
    setSalvando(true);
    const res = await salvarVr(
      competencia,
      cfg,
      dados.map((l) => ({ colaborador_id: l.colaborador_id, valor_dia_padrao: l.valor_dia_padrao, semanas: l.semanas })),
    );
    setSalvando(false);
    if (!res.ok) { toast.error("Erro ao salvar", { description: res.error }); return; }
    toast.success("Competência salva");
    router.refresh();
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1300px] mx-auto space-y-6">
      <PageHeader
        title="Vale-refeição (alimentação)"
        description="Lançamento semanal por colaborador (dias, faltas, extras e viagem), consolidado no mês."
        actions={<Button onClick={salvar} disabled={salvando} className="gap-2"><Save className="size-4" />{salvando ? "Salvando…" : "Salvar competência"}</Button>}
      />

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Campo label="Competência"><Input type="month" value={competencia} onChange={(e) => e.target.value && trocarMes(e.target.value)} className="h-9 w-40" /></Campo>
            <Campo label="Semanas no mês"><Input type="number" min="1" max="6" value={cfg.num_semanas} onChange={(e) => setCfgNum("num_semanas", e.target.value)} className="h-9 w-20" /></Campo>
            <Campo label="Valor/dia viagem"><Input type="number" step="0.01" value={cfg.valor_dia_viagem} onChange={(e) => setCfgNum("valor_dia_viagem", e.target.value)} className="h-9 w-24" /></Campo>
            <div className="flex items-center gap-2 h-9 w-full lg:w-60 rounded-md border bg-background px-3 text-sm lg:ml-auto">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar colaborador…" className="flex-1 bg-transparent outline-none" />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3 border-t pt-3">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground self-center">Valor dos extras:</span>
            <Campo label="Almoço/Janta"><Input type="number" step="0.01" value={cfg.extra_almoco_janta} onChange={(e) => setCfgNum("extra_almoco_janta", e.target.value)} className="h-9 w-24" /></Campo>
            <Campo label="Lanche"><Input type="number" step="0.01" value={cfg.extra_lanche} onChange={(e) => setCfgNum("extra_lanche", e.target.value)} className="h-9 w-24" /></Campo>
            <Campo label="Viagem (extra)"><Input type="number" step="0.01" value={cfg.extra_viagem} onChange={(e) => setCfgNum("extra_viagem", e.target.value)} className="h-9 w-24" /></Campo>
            <div className="ml-auto text-right">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total da competência</div>
              <div className="text-xl font-bold tabular-nums flex items-center gap-1.5"><UtensilsCrossed className="size-4 text-muted-foreground" />{formatBRL(totalGeral)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead className="text-center w-28">Valor/dia padrão</TableHead>
                <TableHead className="text-center">Semanas lançadas</TableHead>
                <TableHead className="text-right">Total do mês</TableHead>
                <TableHead className="w-44 text-center">Semanas</TableHead>
                <TableHead className="w-14 text-right">Recibo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-16 text-center text-sm text-muted-foreground">Nenhum colaborador ativo na empresa selecionada.</TableCell></TableRow>
              ) : (
                filtradas.map((l) => {
                  const preench = l.semanas.filter((s) => s.dias > 0 || s.extra_almoco_janta > 0 || s.extra_lanche > 0 || s.extra_viagem > 0).length;
                  const total = totalLinha(l);
                  return (
                    <TableRow key={l.colaborador_id}>
                      <TableCell>
                        <div className="font-medium">{l.nome}</div>
                        <div className="text-xs text-muted-foreground font-mono">mat. {l.matricula ?? "—"}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input type="number" step="0.01" value={l.valor_dia_padrao} onChange={(e) => setPadrao(l.colaborador_id, Number(e.target.value) || 0)} className="h-8 w-20 mx-auto text-center" />
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">{preench} / {cfg.num_semanas}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{formatBRL(total)}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditId(l.colaborador_id)}>
                          <CalendarDays className="size-3.5" />Editar semanas
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        {l.lancado && total > 0 ? (
                          <a href={`/pessoal/beneficios/recibo?tipo=alimentacao&colaborador=${l.colaborador_id}&competencia=${competencia}`} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))} title="Recibo">
                            <FileText className="size-3.5" />
                          </a>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        “Editar semanas” abre o lançamento semana a semana (dias, faltas, extras e viagem). O total do mês é a soma das semanas. Salve a competência para liberar os recibos.
      </p>

      {editando ? (
        <SemanasDialog
          key={editando.colaborador_id}
          linha={editando}
          cfg={cfg}
          onClose={() => setEditId(null)}
          onApply={(semanas, padrao) => { aplicarSemanas(editando.colaborador_id, semanas, padrao); setEditId(null); }}
        />
      ) : null}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SemanasDialog({
  linha, cfg, onClose, onApply,
}: {
  linha: VrLinha;
  cfg: VrConfig;
  onClose: () => void;
  onApply: (semanas: VrSemana[], padrao: number) => void;
}) {
  const [padrao, setPadrao] = useState(linha.valor_dia_padrao);
  const [semanas, setSemanas] = useState<VrSemana[]>(() =>
    Array.from({ length: cfg.num_semanas }, (_, i) => linha.semanas[i] ?? semanaVazia(linha.valor_dia_padrao)),
  );

  function patch(i: number, p: Partial<VrSemana>) {
    setSemanas((s) => s.map((sem, idx) => (idx === i ? { ...sem, ...p } : sem)));
  }
  function toggleViagem(i: number, on: boolean) {
    // ao marcar viagem, sugere o valor/dia de viagem; ao desmarcar, volta ao padrão
    patch(i, { em_viagem: on, valor_dia: on ? cfg.valor_dia_viagem : padrao });
  }

  const total = totalVrLinha(semanas, cfg);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Semanas — {linha.nome}</DialogTitle>
          <DialogDescription>Lance dias, faltas e extras de cada semana. Marque “viagem” quando o valor/dia for diferente.</DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-3 pb-1">
          <Campo label="Valor/dia padrão">
            <Input type="number" step="0.01" value={padrao} onChange={(e) => setPadrao(Number(e.target.value) || 0)} className="h-9 w-24" />
          </Campo>
          <div className="ml-auto text-right">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total do mês</div>
            <div className="text-lg font-bold tabular-nums">{formatBRL(total)}</div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 px-6 max-h-[55vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Semana</TableHead>
                <TableHead className="text-center">Viagem</TableHead>
                <TableHead className="text-center w-20">Valor/dia</TableHead>
                <TableHead className="text-center w-16">Dias</TableHead>
                <TableHead className="text-center w-16">Faltas</TableHead>
                <TableHead className="text-center w-16">Alm/Jan</TableHead>
                <TableHead className="text-center w-16">Lanche</TableHead>
                <TableHead className="text-center w-16">Viag.</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {semanas.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-sm">{i + 1}ª</TableCell>
                  <TableCell className="text-center">
                    <button type="button" onClick={() => toggleViagem(i, !s.em_viagem)} className={cn("inline-flex items-center justify-center size-7 rounded-md border", s.em_viagem ? "bg-sky-600 text-white border-sky-600" : "text-muted-foreground hover:bg-muted")} title="Em viagem">
                      <Plane className="size-3.5" />
                    </button>
                  </TableCell>
                  <TableCell><Input type="number" step="0.01" value={s.valor_dia} onChange={(e) => patch(i, { valor_dia: Number(e.target.value) || 0 })} className="h-8 w-20 text-center" /></TableCell>
                  <TableCell><Input type="number" min="0" value={s.dias} onChange={(e) => patch(i, { dias: Number(e.target.value) || 0 })} className="h-8 w-14 text-center" /></TableCell>
                  <TableCell><Input type="number" min="0" value={s.faltas} onChange={(e) => patch(i, { faltas: Number(e.target.value) || 0 })} className="h-8 w-14 text-center" /></TableCell>
                  <TableCell><Input type="number" min="0" value={s.extra_almoco_janta} onChange={(e) => patch(i, { extra_almoco_janta: Number(e.target.value) || 0 })} className="h-8 w-14 text-center" /></TableCell>
                  <TableCell><Input type="number" min="0" value={s.extra_lanche} onChange={(e) => patch(i, { extra_lanche: Number(e.target.value) || 0 })} className="h-8 w-14 text-center" /></TableCell>
                  <TableCell><Input type="number" min="0" value={s.extra_viagem} onChange={(e) => patch(i, { extra_viagem: Number(e.target.value) || 0 })} className="h-8 w-14 text-center" /></TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatBRL(saldoSemana(s, cfg))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onApply(semanas, padrao)} className="gap-2"><Save className="size-4" />Aplicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
