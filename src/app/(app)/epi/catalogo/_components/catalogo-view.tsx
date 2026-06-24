"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ArrowLeftRight, Search, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createEpiCatalogo,
  updateEpiCatalogo,
  deleteEpiCatalogo,
  registrarMovimentacaoEpi,
  type EpiCatalogo,
  type EpiCategoria,
  type EpiMarca,
  type CatalogoInput,
} from "@/lib/actions/epi";
import { formatBRL, formatDateBR, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";

const TIPOS = ["EPI", "Uniforme", "Ferramenta", "EPC", "MRO", "Outros"];
const PERIODICIDADES = [30, 60, 90, 180, 365];

type FormState = {
  codigo: string;
  nome: string;
  tipo: string;
  categoria_id: string;
  marca_id: string;
  fabricante: string;
  numero_ca: string;
  validade_ca: string;
  periodicidade_troca_dias: string;
  preco_unitario: string;
  quantidade_minima: string;
  observacoes: string;
  ativo: boolean;
};

const FORM_VAZIO: FormState = {
  codigo: "", nome: "", tipo: "EPI", categoria_id: "", marca_id: "", fabricante: "",
  numero_ca: "", validade_ca: "", periodicidade_troca_dias: "", preco_unitario: "",
  quantidade_minima: "0", observacoes: "", ativo: true,
};

function itemToForm(i: EpiCatalogo): FormState {
  return {
    codigo: i.codigo, nome: i.nome, tipo: i.tipo,
    categoria_id: i.categoria_id ?? "", marca_id: i.marca_id ?? "",
    fabricante: i.fabricante ?? "", numero_ca: i.numero_ca ?? "",
    validade_ca: i.validade_ca ?? "",
    periodicidade_troca_dias: i.periodicidade_troca_dias != null ? String(i.periodicidade_troca_dias) : "",
    preco_unitario: i.preco_unitario ? String(i.preco_unitario) : "",
    quantidade_minima: String(i.quantidade_minima),
    observacoes: i.observacoes ?? "", ativo: i.ativo,
  };
}

export function CatalogoView({
  itens,
  categorias,
  marcas,
}: {
  itens: EpiCatalogo[];
  categorias: EpiCategoria[];
  marcas: EpiMarca[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [mostrarInativos, setMostrarInativos] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const [movItem, setMovItem] = useState<EpiCatalogo | null>(null);
  const [movTipo, setMovTipo] = useState<"entrada" | "saida">("entrada");
  const [movQtd, setMovQtd] = useState("");
  const [movMotivo, setMovMotivo] = useState("Compra");
  const [movNf, setMovNf] = useState("");
  const [movSalvando, setMovSalvando] = useState(false);

  const filtrados = useMemo(() => {
    const q = normalizeSearch(busca);
    return itens.filter((i) => {
      if (!mostrarInativos && !i.ativo) return false;
      if (tipoFiltro !== "todos" && i.tipo !== tipoFiltro) return false;
      if (q && !normalizeSearch(`${i.nome} ${i.codigo} ${i.numero_ca ?? ""}`).includes(q)) return false;
      return true;
    });
  }, [itens, busca, tipoFiltro, mostrarInativos]);

  const kpis = useMemo(() => {
    const ativos = itens.filter((i) => i.ativo);
    const criticos = ativos.filter((i) => i.quantidade_atual <= i.quantidade_minima).length;
    return { total: ativos.length, criticos };
  }, [itens]);

  function abrirNovo() {
    setEditId(null);
    setForm(FORM_VAZIO);
    setFormOpen(true);
  }
  function abrirEdicao(i: EpiCatalogo) {
    setEditId(i.id);
    setForm(itemToForm(i));
    setFormOpen(true);
  }

  async function salvar() {
    if (!form.codigo.trim() || !form.nome.trim()) {
      toast.error("Código e nome são obrigatórios.");
      return;
    }
    if (form.tipo === "EPI" && !form.numero_ca.trim()) {
      toast.error("Para EPI, informe o número do CA.");
      return;
    }
    setSalvando(true);
    const input: CatalogoInput = {
      codigo: form.codigo.trim(),
      nome: form.nome.trim(),
      tipo: form.tipo,
      categoria_id: form.categoria_id || null,
      marca_id: form.marca_id || null,
      fabricante: form.fabricante || null,
      numero_ca: form.numero_ca || null,
      validade_ca: form.validade_ca || null,
      periodicidade_troca_dias: form.periodicidade_troca_dias ? Number(form.periodicidade_troca_dias) : null,
      preco_unitario: form.preco_unitario ? Number(form.preco_unitario) : 0,
      observacoes: form.observacoes || null,
      ativo: form.ativo,
      quantidade_minima: form.quantidade_minima ? Number(form.quantidade_minima) : 0,
    };
    const res = editId ? await updateEpiCatalogo(editId, input) : await createEpiCatalogo(input);
    setSalvando(false);
    if (!res.ok) {
      toast.error("Erro ao salvar", { description: res.error });
      return;
    }
    toast.success(editId ? "Item atualizado" : "Item cadastrado");
    setFormOpen(false);
    router.refresh();
  }

  async function excluir(i: EpiCatalogo) {
    if (!confirm(`Excluir "${i.nome}" do catálogo?`)) return;
    const res = await deleteEpiCatalogo(i.id);
    if (!res.ok) {
      toast.error("Não foi possível excluir", { description: res.error });
      return;
    }
    toast.success("Item excluído");
    router.refresh();
  }

  function abrirMov(i: EpiCatalogo) {
    setMovItem(i);
    setMovTipo("entrada");
    setMovQtd("");
    setMovMotivo("Compra");
    setMovNf("");
  }
  async function salvarMov() {
    if (!movItem) return;
    const qtd = Number(movQtd);
    if (!Number.isFinite(qtd) || qtd <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }
    setMovSalvando(true);
    const res = await registrarMovimentacaoEpi({
      catalogo_id: movItem.id,
      tipo: movTipo,
      quantidade: qtd,
      motivo: movMotivo || null,
      numero_nf: movTipo === "entrada" ? movNf || null : null,
    });
    setMovSalvando(false);
    if (!res.ok) {
      toast.error("Erro na movimentação", { description: res.error });
      return;
    }
    toast.success("Estoque movimentado");
    setMovItem(null);
    router.refresh();
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
      <PageHeader
        title="Catálogo de EPI"
        description="Itens de EPI, uniforme e ferramentas — CA, periodicidade de troca e estoque."
        actions={
          <Button onClick={abrirNovo} className="gap-2">
            <Plus className="size-4" />
            Novo item
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Itens ativos" value={String(kpis.total)} icon={ShieldCheck} tone="ok" />
        <KpiCard label="Estoque crítico" value={String(kpis.criticos)} detail="≤ estoque mínimo" icon={AlertTriangle} tone={kpis.criticos > 0 ? "alert" : "ok"} />
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 h-10 w-full lg:w-80 rounded-md border bg-background px-3 text-sm">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, código ou CA…" className="flex-1 bg-transparent outline-none" />
          </div>
          <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="todos">Todos os tipos</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} className="size-4 rounded border-input" />
            Mostrar inativos
          </label>
          <div className="ml-auto text-xs text-muted-foreground">{filtrados.length} de {itens.length} itens</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>CA</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">
                    {itens.length === 0 ? "Nenhum item no catálogo. Clique em “Novo item”." : "Nenhum item para os filtros."}
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((i) => {
                  const critico = i.quantidade_atual <= i.quantidade_minima;
                  return (
                    <TableRow key={i.id} className={cn(!i.ativo && "opacity-60")}>
                      <TableCell>
                        <div className="font-medium">{i.nome}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {i.codigo}{i.categoria_nome ? ` · ${i.categoria_nome}` : ""}{i.marca_nome ? ` · ${i.marca_nome}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{i.tipo}</TableCell>
                      <TableCell className="text-xs">
                        {i.numero_ca ?? "—"}
                        {i.validade_ca ? <div className="text-muted-foreground">val. {formatDateBR(i.validade_ca)}</div> : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        <span className={cn(critico && "text-rose-600 font-semibold")}>{i.quantidade_atual}</span>
                        <div className="text-[10px] text-muted-foreground">mín. {i.quantidade_minima}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{formatBRL(i.preco_unitario)}</TableCell>
                      <TableCell>
                        {i.ativo
                          ? <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">Ativo</Badge>
                          : <Badge variant="secondary" className="bg-slate-100 text-slate-600">Inativo</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="icon-sm" onClick={() => abrirMov(i)} aria-label="Movimentar estoque">
                            <ArrowLeftRight className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => abrirEdicao(i)} aria-label="Editar">
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => excluir(i)} aria-label="Excluir">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Dialog: novo/editar item ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar item" : "Novo item"}</DialogTitle>
            <DialogDescription>Cadastro do item de EPI/uniforme no catálogo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Código *"><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Ex.: EPI-001" /></Campo>
            <Campo label="Tipo *">
              <NativeSelect value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </NativeSelect>
            </Campo>
            <Campo label="Nome *" className="sm:col-span-2"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Botina de segurança" /></Campo>
            <Campo label="Categoria">
              <NativeSelect value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
                <option value="">—</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </NativeSelect>
            </Campo>
            <Campo label="Marca">
              <NativeSelect value={form.marca_id} onChange={(e) => setForm({ ...form, marca_id: e.target.value })}>
                <option value="">—</option>
                {marcas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </NativeSelect>
            </Campo>
            <Campo label={form.tipo === "EPI" ? "Nº do CA *" : "Nº do CA"}><Input value={form.numero_ca} onChange={(e) => setForm({ ...form, numero_ca: e.target.value })} placeholder="Certificado de Aprovação" /></Campo>
            <Campo label="Validade do CA"><Input type="date" value={form.validade_ca} onChange={(e) => setForm({ ...form, validade_ca: e.target.value })} /></Campo>
            <Campo label="Periodicidade de troca (dias)">
              <div className="flex items-center gap-2">
                <Input type="number" min="0" value={form.periodicidade_troca_dias} onChange={(e) => setForm({ ...form, periodicidade_troca_dias: e.target.value })} className="w-28" />
                <div className="flex gap-1">
                  {PERIODICIDADES.map((p) => (
                    <button key={p} type="button" onClick={() => setForm({ ...form, periodicidade_troca_dias: String(p) })} className="rounded border px-1.5 py-0.5 text-[11px] hover:bg-muted">{p}</button>
                  ))}
                </div>
              </div>
            </Campo>
            <Campo label="Preço unitário"><Input type="number" step="0.01" value={form.preco_unitario} onChange={(e) => setForm({ ...form, preco_unitario: e.target.value })} placeholder="0,00" /></Campo>
            <Campo label="Estoque mínimo"><Input type="number" min="0" value={form.quantidade_minima} onChange={(e) => setForm({ ...form, quantidade_minima: e.target.value })} /></Campo>
            <Campo label="Fabricante"><Input value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} /></Campo>
            <Campo label="Observações" className="sm:col-span-2"><Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></Campo>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} className="size-4 rounded border-input" />
              Item ativo
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: movimentação rápida ── */}
      <Dialog open={movItem !== null} onOpenChange={(o) => { if (!o) setMovItem(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Movimentar estoque</DialogTitle>
            <DialogDescription>{movItem?.nome} · saldo atual {movItem?.quantidade_atual ?? 0}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="inline-flex rounded-md border p-0.5 w-fit">
              <button type="button" onClick={() => { setMovTipo("entrada"); setMovMotivo("Compra"); }} className={cn("px-3 py-1.5 text-xs font-semibold rounded", movTipo === "entrada" ? "bg-emerald-600 text-white" : "hover:bg-muted")}>Entrada</button>
              <button type="button" onClick={() => { setMovTipo("saida"); setMovMotivo("Ajuste"); }} className={cn("px-3 py-1.5 text-xs font-semibold rounded", movTipo === "saida" ? "bg-rose-600 text-white" : "hover:bg-muted")}>Saída</button>
            </div>
            <Campo label="Quantidade *"><Input type="number" min="1" value={movQtd} onChange={(e) => setMovQtd(e.target.value)} /></Campo>
            <Campo label="Motivo">
              <NativeSelect value={movMotivo} onChange={(e) => setMovMotivo(e.target.value)}>
                {(movTipo === "entrada" ? ["Compra", "Devolução", "Ajuste", "Transferência"] : ["Ajuste", "Perda", "Transferência", "Descarte"]).map((m) => <option key={m} value={m}>{m}</option>)}
              </NativeSelect>
            </Campo>
            {movTipo === "entrada" && <Campo label="Nº da NF"><Input value={movNf} onChange={(e) => setMovNf(e.target.value)} /></Campo>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovItem(null)}>Cancelar</Button>
            <Button onClick={salvarMov} disabled={movSalvando}>{movSalvando ? "Salvando…" : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Campo({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}

const NativeSelect = ({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={cn("h-9 w-full rounded-md border border-input bg-background px-3 text-sm", className)}>{children}</select>
);

type Tone = "ok" | "alert";
function KpiCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail?: string; icon: React.ComponentType<{ className?: string }>; tone: Tone }) {
  const tones = { ok: "bg-emerald-50 text-emerald-600", alert: "bg-rose-50 text-rose-600" };
  return (
    <Card>
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className="text-3xl font-bold mt-2">{value}</div>
          {detail ? <div className="text-xs text-muted-foreground mt-1">{detail}</div> : null}
        </div>
        <div className={cn("size-10 rounded-lg grid place-items-center", tones[tone])}><Icon className="size-5" /></div>
      </CardContent>
    </Card>
  );
}
