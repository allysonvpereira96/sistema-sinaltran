import Link from "next/link";
import {
  ShieldCheck, AlertTriangle, ArrowLeftRight, HardHat,
  CalendarClock, BookOpen, Boxes, Plus, BarChart3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { listEpiCatalogo, listEpiEntregas } from "@/lib/actions/epi";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Almoxarifado de EPI" };

function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AlmoxarifadoEpiPage() {
  const [itens, entregas] = await Promise.all([listEpiCatalogo(), listEpiEntregas()]);
  const hoje = hojeIso();
  const em30 = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })();

  const ativos = itens.filter((i) => i.ativo);
  const criticos = ativos.filter((i) => i.quantidade_atual <= i.quantidade_minima).length;
  const valorEstoque = ativos.reduce((s, i) => s + i.quantidade_atual * i.preco_unitario, 0);

  const emUso = entregas.filter((e) => !e.data_devolucao);
  const trocasVencidas = emUso.filter((e) => e.data_prevista_troca && e.data_prevista_troca < hoje).length;
  const trocasProximas = emUso.filter((e) => e.data_prevista_troca && e.data_prevista_troca >= hoje && e.data_prevista_troca <= em30).length;
  const mes = hoje.slice(0, 7);
  const entregasMes = entregas.filter((e) => e.data_entrega.slice(0, 7) === mes).length;

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Almoxarifado de EPI"
        description="Catálogo, estoque, entregas a colaboradores e trocas."
        actions={
          <Link href="/almoxarifado/epi/nova-entrega" className="inline-flex items-center gap-2 h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            <Plus className="size-4" />Nova entrega
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Itens ativos" value={String(ativos.length)} detail={`${formatBRL(valorEstoque)} em estoque`} icon={ShieldCheck} tone="ok" />
        <Kpi label="Estoque crítico" value={String(criticos)} detail="≤ mínimo" icon={AlertTriangle} tone={criticos ? "alert" : "ok"} />
        <Kpi label="Trocas vencidas" value={String(trocasVencidas)} detail={`${trocasProximas} nos próx. 30 dias`} icon={CalendarClock} tone={trocasVencidas ? "alert" : "ok"} />
        <Kpi label="Entregas no mês" value={String(entregasMes)} detail={`${emUso.length} EPIs em uso`} icon={HardHat} tone="ok" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Atalho href="/almoxarifado/epi/catalogo" titulo="Catálogo" desc="Itens, CA, periodicidade e preço." icon={BookOpen} />
        <Atalho href="/almoxarifado/epi/estoque" titulo="Estoque" desc="Saldos, mínimos e alertas." icon={Boxes} />
        <Atalho href="/almoxarifado/epi/movimentacoes" titulo="Movimentações" desc="Entradas e saídas de estoque." icon={ArrowLeftRight} />
        <Atalho href="/almoxarifado/epi/nova-entrega" titulo="Nova entrega" desc="Entregar EPI a um colaborador." icon={Plus} />
        <Atalho href="/almoxarifado/epi/entregas" titulo="Entregas" desc="Histórico, trocas e devoluções." icon={HardHat} />
        <Atalho href="/almoxarifado/epi/relatorios" titulo="Relatórios" desc="Trocas, consumo e sem entrega." icon={BarChart3} />
      </div>
    </div>
  );
}

type Tone = "ok" | "alert";
function Kpi({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail?: string; icon: React.ComponentType<{ className?: string }>; tone: Tone }) {
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

function Atalho({ href, titulo, desc, icon: Icon }: { href: string; titulo: string; desc: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Link href={href} className="block">
      <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/40">
        <CardContent className="flex items-start gap-3 p-5">
          <div className="size-10 shrink-0 rounded-md bg-primary/10 text-primary grid place-items-center"><Icon className="size-5" /></div>
          <div>
            <div className="font-semibold">{titulo}</div>
            <div className="text-sm text-muted-foreground">{desc}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
