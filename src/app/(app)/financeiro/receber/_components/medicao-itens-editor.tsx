"use client";

import { useEffect, useRef, useState } from "react";
import { Percent, Ruler, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getItensParaMedicao } from "@/lib/actions/medicoes";
import {
  itemPrecoUnit,
  type ItemParaMedicao,
  type MedicaoItemInput,
  type MedicaoItemRow,
  type MedicaoItemTipo,
} from "@/lib/types/medicao";
import { formatBRL, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Linha = {
  key: string;
  orcamento_item_id: string | null;
  secao: string | null;
  tipo: MedicaoItemTipo;
  descricao: string;
  unidade_medida: string;
  quantidade_contratada: number;
  valor_unit_mao_obra: number;
  valor_unit_material: number;
  ja_medido: number;
  saldo: number;
  quantidade_medida: number;
  /** serviços podem ser medidos por % (do contratado) em vez de metragem. */
  modo_percent: boolean;
};

export type PlanilhaResumo = {
  itens: MedicaoItemInput[];
  total: number;
  temPlanilha: boolean;
};

const pu = (l: Linha) => itemPrecoUnit(l);
const valorLinha = (l: Linha) => l.quantidade_medida * pu(l);
const round3 = (n: number) => Math.round((Number(n) || 0) * 1000) / 1000;

function itemToLinha(it: ItemParaMedicao, qtd: number): Linha {
  return {
    key: it.orcamento_item_id,
    orcamento_item_id: it.orcamento_item_id,
    secao: it.secao,
    tipo: it.tipo,
    descricao: it.descricao,
    unidade_medida: it.unidade_medida,
    quantidade_contratada: it.quantidade_contratada,
    valor_unit_mao_obra: it.valor_unit_mao_obra,
    valor_unit_material: it.valor_unit_material,
    ja_medido: it.ja_medido,
    saldo: it.saldo,
    quantidade_medida: qtd,
    modo_percent: false,
  };
}

function avulsoToLinha(i: MedicaoItemRow): Linha {
  return {
    key: i.id,
    orcamento_item_id: null,
    secao: null,
    tipo: i.tipo,
    descricao: i.descricao,
    unidade_medida: i.unidade_medida,
    quantidade_contratada: i.quantidade_contratada,
    valor_unit_mao_obra: i.valor_unit_mao_obra,
    valor_unit_material: i.valor_unit_material,
    ja_medido: 0,
    saldo: i.quantidade_contratada,
    quantidade_medida: i.quantidade_medida,
    modo_percent: false,
  };
}

export function MedicaoItensEditor({
  obraId,
  excludeMedicaoId,
  initialItens,
  onChange,
}: {
  obraId: string;
  excludeMedicaoId?: string;
  initialItens?: MedicaoItemRow[];
  onChange: (resumo: PlanilhaResumo) => void;
}) {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(false);
  const [carregado, setCarregado] = useState(false);
  // initialItens só importa no primeiro load (edição) — fixa por ref.
  const initialRef = useRef(initialItens);

  useEffect(() => {
    let cancel = false;
    const carregar = async () => {
      if (!obraId) {
        if (!cancel) {
          setLinhas([]);
          setCarregado(false);
        }
        return;
      }
      setLoading(true);
      try {
        const lista = await getItensParaMedicao(obraId, excludeMedicaoId);
        if (cancel) return;
        const medidos = new Map<string, number>();
        for (const i of initialRef.current ?? []) {
          if (i.orcamento_item_id) medidos.set(i.orcamento_item_id, i.quantidade_medida);
        }
        const novas = lista.map((it) =>
          itemToLinha(it, medidos.get(it.orcamento_item_id) ?? 0),
        );
        // Itens avulsos da medição em edição (sem vínculo com o orçamento).
        for (const i of initialRef.current ?? []) {
          if (!i.orcamento_item_id) novas.push(avulsoToLinha(i));
        }
        setLinhas(novas);
        setCarregado(true);
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    void carregar();
    return () => {
      cancel = true;
    };
  }, [obraId, excludeMedicaoId]);

  // Emite resumo para o formulário sempre que as linhas mudam.
  useEffect(() => {
    const itens: MedicaoItemInput[] = linhas
      .filter((l) => l.quantidade_medida > 0)
      .map((l, idx) => ({
        orcamento_item_id: l.orcamento_item_id,
        ordem: idx,
        tipo: l.tipo,
        descricao: l.descricao,
        unidade_medida: l.unidade_medida,
        quantidade_contratada: l.quantidade_contratada,
        valor_unit_mao_obra: l.valor_unit_mao_obra,
        valor_unit_material: l.valor_unit_material,
        quantidade_medida: l.quantidade_medida,
      }));
    const total = itens.reduce((s, i) => s + i.quantidade_medida * itemPrecoUnit(i), 0);
    onChange({ itens, total, temPlanilha: linhas.length > 0 });
  }, [linhas, onChange]);

  function setQtd(key: string, valor: number) {
    setLinhas((prev) =>
      prev.map((l) =>
        l.key === key ? { ...l, quantidade_medida: Number.isNaN(valor) ? 0 : round3(valor) } : l,
      ),
    );
  }

  function setPct(key: string, pct: number) {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const p = Number.isNaN(pct) ? 0 : pct;
        return { ...l, quantidade_medida: round3((p / 100) * l.quantidade_contratada) };
      }),
    );
  }

  function toggleModo(key: string) {
    setLinhas((prev) =>
      prev.map((l) => (l.key === key ? { ...l, modo_percent: !l.modo_percent } : l)),
    );
  }

  function medirSaldo(key: string) {
    setLinhas((prev) =>
      prev.map((l) => (l.key === key ? { ...l, quantidade_medida: l.saldo } : l)),
    );
  }

  function medirTudo() {
    setLinhas((prev) => prev.map((l) => ({ ...l, quantidade_medida: l.saldo })));
  }

  function limparTudo() {
    setLinhas((prev) => prev.map((l) => ({ ...l, quantidade_medida: 0 })));
  }

  if (!obraId) return null;

  const total = linhas.reduce((s, l) => s + valorLinha(l), 0);
  const algumMedido = linhas.some((l) => l.quantidade_medida > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Planilha de medição</CardTitle>
          <CardDescription>
            Itens do orçamento com saldo a medir. Material → quantidade; serviço → metragem ou %.
          </CardDescription>
        </div>
        {linhas.length > 0 ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={medirTudo}>
              Medir todo o saldo
            </Button>
            {algumMedido ? (
              <Button type="button" variant="ghost" size="sm" onClick={limparTudo}>
                Limpar
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando itens do orçamento…
          </div>
        ) : !carregado || linhas.length === 0 ? (
          <div className="py-10 px-6 text-center text-sm text-muted-foreground">
            {carregado
              ? "Esta obra não tem orçamento vinculado com itens em aberto. Você ainda pode lançar o valor manualmente abaixo."
              : "Selecione a obra para carregar a planilha."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                  <th className="text-left font-semibold py-2 px-3">Item</th>
                  <th className="text-center font-semibold py-2 px-2 w-14">Un.</th>
                  <th className="text-right font-semibold py-2 px-2 w-24">Contratado</th>
                  <th className="text-right font-semibold py-2 px-2 w-24">Saldo</th>
                  <th className="text-right font-semibold py-2 px-2 w-36">Medir</th>
                  <th className="text-right font-semibold py-2 px-3 w-28">Valor</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const excede = l.quantidade_medida > l.saldo + 0.0005;
                  const pct = l.quantidade_contratada
                    ? (l.quantidade_medida / l.quantidade_contratada) * 100
                    : 0;
                  return (
                    <tr key={l.key} className="border-b last:border-b-0 align-top">
                      <td className="py-2 px-3">
                        <div className="font-medium leading-snug">{l.descricao}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-block rounded px-1 py-px text-[9px] font-semibold uppercase",
                              l.tipo === "material"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-sky-100 text-sky-700",
                            )}
                          >
                            {l.tipo === "material" ? "Material" : "Serviço"}
                          </span>
                          {l.secao ? <span>{l.secao}</span> : null}
                          <span>· {formatBRL(pu(l))}/{l.unidade_medida}</span>
                          {l.ja_medido > 0 ? (
                            <span>· já medido {formatNumber(l.ja_medido)}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center text-xs">{l.unidade_medida}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-xs">
                        {formatNumber(l.quantidade_contratada)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-xs font-medium">
                        {formatNumber(l.saldo)}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-end gap-1">
                          {l.modo_percent ? (
                            <div className="relative w-20">
                              <Input
                                type="number"
                                step="0.1"
                                min={0}
                                value={pct ? round3(pct) : ""}
                                onChange={(e) => setPct(l.key, e.target.valueAsNumber)}
                                className={cn("h-8 pr-5 text-right", excede && "border-rose-400")}
                              />
                              <Percent className="size-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            </div>
                          ) : (
                            <Input
                              type="number"
                              step="0.001"
                              min={0}
                              value={l.quantidade_medida || ""}
                              onChange={(e) => setQtd(l.key, e.target.valueAsNumber)}
                              className={cn("h-8 w-20 text-right", excede && "border-rose-400")}
                            />
                          )}
                          {l.tipo === "servico" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              title={l.modo_percent ? "Medir por metragem" : "Medir por %"}
                              onClick={() => toggleModo(l.key)}
                            >
                              {l.modo_percent ? (
                                <Ruler className="size-3.5" />
                              ) : (
                                <Percent className="size-3.5" />
                              )}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-1.5 text-[11px]"
                            title="Medir o saldo"
                            onClick={() => medirSaldo(l.key)}
                          >
                            saldo
                          </Button>
                        </div>
                        {excede ? (
                          <div className="text-[10px] text-rose-600 text-right mt-0.5">
                            excede o saldo
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold">
                        {formatBRL(valorLinha(l))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/40">
                  <td colSpan={5} className="py-2.5 px-3 text-right font-semibold">
                    Total da medição
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-bold">
                    {formatBRL(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
