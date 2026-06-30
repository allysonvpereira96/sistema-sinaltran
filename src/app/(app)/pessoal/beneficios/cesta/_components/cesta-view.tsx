"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, FileText, ShoppingBasket, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { salvarCesta, type CestaLinha } from "@/lib/actions/beneficios";
import { formatDateBR, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CestaView({ competencia, linhas }: { competencia: string; linhas: CestaLinha[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [dados, setDados] = useState<CestaLinha[]>(linhas);
  const [salvando, setSalvando] = useState(false);

  const [y, m] = competencia.split("-");
  const filtradas = useMemo(() => {
    const q = normalizeSearch(busca);
    return dados.filter((l) => !q || normalizeSearch(`${l.nome} ${l.matricula ?? ""}`).includes(q));
  }, [dados, busca]);

  const recebem = dados.filter((l) => l.recebe).length;

  function patch(id: string, p: Partial<CestaLinha>) {
    setDados((d) => d.map((l) => (l.colaborador_id === id ? { ...l, ...p } : l)));
  }
  function trocarMes(ym: string) {
    router.push(`/pessoal/beneficios/cesta?competencia=${ym}`);
  }

  async function salvar() {
    setSalvando(true);
    const res = await salvarCesta(
      competencia,
      dados.map((l) => ({ colaborador_id: l.colaborador_id, recebe: l.recebe, observacao: l.observacao, faltas: l.faltas, atestados: l.atestados })),
    );
    setSalvando(false);
    if (!res.ok) { toast.error("Erro ao salvar", { description: res.error }); return; }
    toast.success("Competência salva");
    router.refresh();
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1300px] mx-auto space-y-6">
      <PageHeader
        title="Cesta básica"
        description="Quem recebe a cesta no mês (empresa ativa). Quem teve falta ou 2+ atestados perde — já vem sugerido do caderno."
        actions={
          <Button onClick={salvar} disabled={salvando} className="gap-2">
            <Save className="size-4" />{salvando ? "Salvando…" : "Salvar competência"}
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Competência</label>
            <Input type="month" value={competencia} onChange={(e) => e.target.value && trocarMes(e.target.value)} className="h-9 w-40" />
          </div>
          <div className="flex items-center gap-2 h-9 w-full lg:w-72 rounded-md border bg-background px-3 text-sm mt-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar colaborador…" className="flex-1 bg-transparent outline-none" />
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm mt-4">
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 gap-1"><ShoppingBasket className="size-3" />{recebem} recebem</Badge>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600">{dados.length - recebem} não</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Admissão</TableHead>
                <TableHead className="text-center">Faltas / Atestados</TableHead>
                <TableHead className="text-center">Recebe?</TableHead>
                <TableHead>Observação (se não recebe)</TableHead>
                <TableHead className="w-16 text-right">Recibo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-16 text-center text-sm text-muted-foreground">Nenhum colaborador ativo na empresa selecionada.</TableCell></TableRow>
              ) : (
                filtradas.map((l) => (
                  <TableRow key={l.colaborador_id}>
                    <TableCell>
                      <div className="font-medium">{l.nome}</div>
                      <div className="text-xs text-muted-foreground font-mono">mat. {l.matricula ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-xs">{formatDateBR(l.admissao)}</TableCell>
                    <TableCell className="text-center text-sm">
                      <span className={cn(l.faltas > 0 && "text-rose-600 font-semibold")}>{l.faltas}</span>
                      {" / "}
                      <span className={cn(l.atestados >= 2 && "text-rose-600 font-semibold")}>{l.atestados}</span>
                      {l.perde_regra && <div className="text-[10px] text-amber-600">perde pela regra</div>}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex rounded-md border p-0.5">
                        <button type="button" onClick={() => patch(l.colaborador_id, { recebe: true })} className={cn("px-3 py-1 text-xs font-semibold rounded", l.recebe ? "bg-emerald-600 text-white" : "hover:bg-muted")}>Sim</button>
                        <button type="button" onClick={() => patch(l.colaborador_id, { recebe: false })} className={cn("px-3 py-1 text-xs font-semibold rounded", !l.recebe ? "bg-rose-600 text-white" : "hover:bg-muted")}>Não</button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={l.observacao ?? ""}
                        onChange={(e) => patch(l.colaborador_id, { observacao: e.target.value })}
                        placeholder={l.recebe ? "—" : "Motivo de não receber"}
                        disabled={l.recebe}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {l.recebe && l.lancado ? (
                        <a
                          href={`/pessoal/beneficios/recibo?tipo=cesta&colaborador=${l.colaborador_id}&competencia=${competencia}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                          title="Recibo para assinar"
                        >
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
        Mês {m}/{y}. Salve a competência para liberar os recibos. O recibo abre quando o colaborador está marcado como “recebe”.
      </p>
    </div>
  );
}
