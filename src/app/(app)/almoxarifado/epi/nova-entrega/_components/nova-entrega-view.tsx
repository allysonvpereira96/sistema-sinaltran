"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Check, Loader2, User, Shirt, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Colaborador } from "@/lib/mocks/colaboradores";
import {
  listEpiEmUso,
  createEntregaEpi,
  type EpiCatalogo,
  type EpiEntregaEmUso,
} from "@/lib/actions/epi";
import { formatDateBR, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";
import { QrAssinaturaDialog } from "../../_components/qr-assinatura-dialog";

const MOTIVOS = ["Primeira entrega", "Troca por vencimento", "Troca por desgaste", "Perda/Extravio", "Mudança de função"];

/** Kit padrão da entrega inicial (nome de referência + CA + quantidade). */
const ENTREGA_INICIAL: { nome: string; ca: string | null; qtd: number }[] = [
  { nome: "Botina bico de aço", ca: "17138", qtd: 1 },
  { nome: "Luva PU preta", ca: "15272", qtd: 1 },
  { nome: "Óculos proteção incolor", ca: "19176", qtd: 1 },
  { nome: "Óculos proteção escuro", ca: "19176", qtd: 1 },
  { nome: "Capacete com jugular", ca: "29792", qtd: 1 },
  { nome: "Máscara de fuga", ca: "5821", qtd: 1 },
  { nome: "Máscara PFF2", ca: "38503", qtd: 1 },
  { nome: "Protetor auricular plug", ca: "14470", qtd: 1 },
  { nome: "Protetor solar", ca: null, qtd: 1 },
  { nome: "Colete refletivo", ca: null, qtd: 1 },
  { nome: "Cinto segurança com talabarte", ca: "35509", qtd: 1 },
  { nome: "Camiseta refletiva manga longa", ca: null, qtd: 2 },
  { nome: "Camiseta refletiva manga curta", ca: null, qtd: 1 },
  { nome: "Calça laranja refletiva", ca: null, qtd: 2 },
  { nome: "Jaqueta laranja refletiva", ca: null, qtd: 1 },
  { nome: "Chapéu pescador", ca: null, qtd: 1 },
];

const digitosCA = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** Casa um item do kit padrão a um item do catálogo (por nome + CA). */
function casarItemCatalogo(
  entry: { nome: string; ca: string | null },
  itens: EpiCatalogo[],
): EpiCatalogo | null {
  const tokens = normalizeSearch(entry.nome).split(/\s+/).filter((t) => t.length >= 3);
  const caRef = digitosCA(entry.ca);
  let melhor: EpiCatalogo | null = null;
  let melhorScore = 0;
  for (const it of itens) {
    const nome = normalizeSearch(it.nome);
    let score = 0;
    for (const t of tokens) if (nome.includes(t)) score += 1;
    if (caRef && digitosCA(it.numero_ca) === caRef) score += 2;
    if (score > melhorScore) {
      melhorScore = score;
      melhor = it;
    }
  }
  return melhorScore >= 1 ? melhor : null;
}

type LinhaItem = { uid: number; catalogo_id: string; quantidade: string; motivo: string };

function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function NovaEntregaView({
  colaboradores,
  itens,
}: {
  colaboradores: Colaborador[];
  itens: EpiCatalogo[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [colab, setColab] = useState<Colaborador | null>(null);
  const [emUso, setEmUso] = useState<EpiEntregaEmUso[]>([]);
  const [devolver, setDevolver] = useState<Set<string>>(new Set());
  const [linhas, setLinhas] = useState<LinhaItem[]>([{ uid: 1, catalogo_id: "", quantidade: "1", motivo: "Primeira entrega" }]);
  const [dataEntrega, setDataEntrega] = useState(hojeIso());
  const [salvando, setSalvando] = useState(false);
  const [tokenGerado, setTokenGerado] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const seq = useRef(1);

  const itensAtivos = useMemo(() => itens.filter((i) => i.ativo), [itens]);
  const itemById = useMemo(() => new Map(itens.map((i) => [i.id, i])), [itens]);

  const filtrados = useMemo(() => {
    const q = normalizeSearch(busca);
    if (!q) return colaboradores.slice(0, 8);
    return colaboradores
      .filter((c) => normalizeSearch(`${c.nome_completo} ${c.matricula ?? ""} ${c.cpf ?? ""}`).includes(q))
      .slice(0, 12);
  }, [colaboradores, busca]);

  async function selecionar(c: Colaborador) {
    setColab(c);
    setBusca("");
    setDevolver(new Set());
    const uso = await listEpiEmUso(c.id);
    setEmUso(uso);
  }

  function addLinha() {
    seq.current += 1;
    setLinhas((l) => [...l, { uid: seq.current, catalogo_id: "", quantidade: "1", motivo: "Primeira entrega" }]);
  }
  function entregaInicial() {
    if (itensAtivos.length === 0) {
      toast.error("Catálogo de EPI vazio — cadastre os itens primeiro.");
      return;
    }
    const novas: LinhaItem[] = [];
    const naoEncontrados: string[] = [];
    for (const e of ENTREGA_INICIAL) {
      const cat = casarItemCatalogo(e, itensAtivos);
      if (!cat) {
        naoEncontrados.push(e.nome);
        continue;
      }
      seq.current += 1;
      novas.push({ uid: seq.current, catalogo_id: cat.id, quantidade: String(e.qtd), motivo: "Primeira entrega" });
    }
    if (novas.length === 0) {
      toast.error("Nenhum item do kit padrão foi encontrado no catálogo de EPI.");
      return;
    }
    setLinhas(novas);
    toast.success(`Entrega inicial: ${novas.length} item(ns) adicionados.`, {
      description: naoEncontrados.length
        ? `Não encontrados no catálogo (adicione manualmente): ${naoEncontrados.join(", ")}`
        : "Revise e remova o que não for entregar.",
    });
  }
  function patchLinha(uid: number, patch: Partial<LinhaItem>) {
    setLinhas((l) => l.map((x) => (x.uid === uid ? { ...x, ...patch } : x)));
  }
  function removeLinha(uid: number) {
    setLinhas((l) => (l.length > 1 ? l.filter((x) => x.uid !== uid) : l));
  }
  function toggleDevolver(id: string) {
    setDevolver((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function registrar() {
    if (!colab) { toast.error("Selecione um colaborador."); return; }
    const itensValidos = linhas
      .filter((l) => l.catalogo_id && Number(l.quantidade) > 0)
      .map((l) => {
        const cat = itemById.get(l.catalogo_id);
        return {
          catalogo_id: l.catalogo_id,
          quantidade: Number(l.quantidade),
          motivo: l.motivo,
          periodicidade_troca_dias: cat?.periodicidade_troca_dias ?? null,
        };
      });
    if (itensValidos.length === 0) { toast.error("Adicione ao menos um item."); return; }

    setSalvando(true);
    const res = await createEntregaEpi({
      colaborador_id: colab.id,
      data_entrega: dataEntrega,
      itens: itensValidos,
      devolver_ids: [...devolver],
    });
    setSalvando(false);
    if (!res.ok) { toast.error("Erro ao registrar", { description: res.error }); return; }
    toast.success(`Entrega registrada (${res.total} item(ns))`);
    // mostra o QR para o colaborador assinar; ao fechar, vai para o histórico
    setTokenGerado(res.token);
    setQrOpen(true);
  }

  const tamanhos = colab
    ? [
        ["Camisa", colab.tamanho_camisa],
        ["Calça", colab.tamanho_calca],
        ["Calçado", colab.tamanho_calcado],
        ["Luva", colab.tamanho_luva],
        ["Macacão", colab.tamanho_macacao],
      ].filter(([, v]) => v)
    : [];

  return (
    <div className="p-6 lg:p-8 max-w-[1000px] mx-auto space-y-6">
      <header className="flex items-center gap-3">
        <Link href="/almoxarifado/epi/entregas" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))} aria-label="Voltar">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Nova entrega de EPI</h1>
          <p className="text-sm text-muted-foreground">Selecione o colaborador, confira o que está em uso e registre os itens entregues.</p>
        </div>
      </header>

      {/* 1) Colaborador */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><User className="size-4" />Colaborador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {colab ? (
            <div className="flex items-start justify-between gap-3 rounded-md border bg-background p-3">
              <div>
                <div className="font-semibold">{colab.nome_completo}</div>
                <div className="text-xs text-muted-foreground">
                  {colab.matricula ? `Mat. ${colab.matricula} · ` : ""}{colab.cargo}
                </div>
                {tamanhos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Shirt className="size-3.5 text-muted-foreground" />
                    {tamanhos.map(([k, v]) => (
                      <Badge key={k} variant="secondary" className="text-[11px] bg-muted text-muted-foreground">{k}: {v}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setColab(null); setEmUso([]); }}>Trocar</Button>
            </div>
          ) : (
            <>
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, matrícula ou CPF…" />
              <div className="rounded-md border bg-background divide-y max-h-56 overflow-y-auto">
                {filtrados.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center">Nenhum colaborador.</div>
                ) : filtrados.map((c) => (
                  <button key={c.id} type="button" onClick={() => selecionar(c)} className="w-full text-left px-3 py-2 hover:bg-muted text-sm">
                    <div className="font-medium">{c.nome_completo}</div>
                    <div className="text-[11px] text-muted-foreground">{c.matricula ? `Mat. ${c.matricula} · ` : ""}{c.cargo}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 2) EPIs em uso */}
      {colab && emUso.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">EPIs em uso</CardTitle>
            <CardDescription>Marque os que serão devolvidos nesta troca (saem de “em uso”).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {emUso.map((e) => (
              <label key={e.id} className="flex items-center gap-3 rounded-md border p-2.5 cursor-pointer">
                <input type="checkbox" checked={devolver.has(e.id)} onChange={() => toggleDevolver(e.id)} className="size-4 rounded border-input" />
                <div className="flex-1 text-sm">
                  <span className="font-medium">{e.item_nome}</span>
                  <span className="text-muted-foreground"> · {e.quantidade} un · entregue {formatDateBR(e.data_entrega)}</span>
                </div>
                {e.data_prevista_troca && <Badge variant="secondary" className="text-[11px] bg-muted text-muted-foreground">troca {formatDateBR(e.data_prevista_troca)}</Badge>}
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 3) Itens a entregar */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Itens a entregar</CardTitle>
            <CardDescription>
              Use “Entrega inicial” para carregar o kit padrão e ajuste o que precisar.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={entregaInicial} className="gap-2 shrink-0">
            <PackageCheck className="size-4" />
            Entrega inicial
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {linhas.map((l) => {
            const cat = itemById.get(l.catalogo_id);
            return (
              <div key={l.uid} className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[220px] space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Item</Label>
                  <select value={l.catalogo_id} onChange={(e) => patchLinha(l.uid, { catalogo_id: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Selecione…</option>
                    {itensAtivos.map((i) => <option key={i.id} value={i.id}>{i.codigo} · {i.nome} (saldo {i.quantidade_atual})</option>)}
                  </select>
                </div>
                <div className="w-20 space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Qtd</Label>
                  <Input type="number" min="1" value={l.quantidade} onChange={(e) => patchLinha(l.uid, { quantidade: e.target.value })} className="h-9" />
                </div>
                <div className="w-44 space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Motivo</Label>
                  <select value={l.motivo} onChange={(e) => patchLinha(l.uid, { motivo: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => removeLinha(l.uid)} aria-label="Remover" className="mb-1">
                  <Trash2 className="size-3.5" />
                </Button>
                {cat && cat.quantidade_atual < Number(l.quantidade || 0) && (
                  <p className="w-full text-[11px] text-amber-600">Saldo insuficiente ({cat.quantidade_atual}); o estoque ficará negativo.</p>
                )}
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={addLinha} className="gap-2"><Plus className="size-4" />Adicionar item</Button>
        </CardContent>
      </Card>

      {/* 4) Confirmar */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Data da entrega</Label>
            <Input type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} className="w-44" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/almoxarifado/epi/entregas" className={cn(buttonVariants({ variant: "outline" }))}>Cancelar</Link>
            <Button onClick={registrar} disabled={salvando || !colab} className="gap-2">
              {salvando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Registrar entrega
            </Button>
          </div>
        </CardContent>
      </Card>

      <QrAssinaturaDialog
        token={tokenGerado}
        open={qrOpen}
        onOpenChange={(o) => {
          setQrOpen(o);
          if (!o) {
            router.push("/almoxarifado/epi/entregas");
            router.refresh();
          }
        }}
      />
    </div>
  );
}
