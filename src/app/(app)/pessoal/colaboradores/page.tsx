"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Users,
  Plane,
  HeartPulse,
  Wallet,
  Eye,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  COLABORADORES,
  COLABORADOR_STATUS_LABEL,
  COLABORADOR_STATUS_TONE,
  type ColaboradorStatus,
} from "@/lib/mocks/colaboradores";
import { OBRAS } from "@/lib/mocks/obras";
import { formatBRL, formatDateBR, formatTelefone, normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";

type FiltroStatus = "todos" | ColaboradorStatus;

const FILTROS_STATUS: { value: FiltroStatus; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ativo", label: "Ativos" },
  { value: "ferias", label: "Em férias" },
  { value: "afastado", label: "Afastados" },
  { value: "desligado", label: "Desligados" },
];

export default function ColaboradoresPage() {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroStatus>("todos");
  const [obraId, setObraId] = useState<string>("todas");

  const obraById = useMemo(() => new Map(OBRAS.map((o) => [o.id, o])), []);

  const filtrados = useMemo(() => {
    const q = normalizeSearch(busca);
    return COLABORADORES.filter((c) => {
      if (
        q &&
        !normalizeSearch(c.nome_completo).includes(q) &&
        !normalizeSearch(c.matricula ?? "").includes(q) &&
        !normalizeSearch(c.cargo).includes(q) &&
        !normalizeSearch(c.cpf ?? "").includes(q)
      ) {
        return false;
      }
      if (obraId !== "todas" && c.obra_id !== obraId) return false;
      if (filtro !== "todos" && c.status !== filtro) return false;
      return true;
    });
  }, [busca, filtro, obraId]);

  const counts = useMemo(() => {
    const ativos = COLABORADORES.filter((c) => c.status === "ativo").length;
    const ferias = COLABORADORES.filter((c) => c.status === "ferias").length;
    const afastados = COLABORADORES.filter((c) => c.status === "afastado").length;
    const folhaAtivos = COLABORADORES.filter((c) => c.status === "ativo").reduce(
      (acc, c) => acc + (c.remuneracao_base ?? 0) + c.ajuda_custo,
      0,
    );
    return { total: COLABORADORES.length, ativos, ferias, afastados, folhaAtivos };
  }, []);

  const handleNotImplemented = (label: string) =>
    toast.info(label, {
      description: "Esta ação será habilitada nas próximas etapas do módulo.",
    });

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
      <PageHeader
        title="Colaboradores"
        description="Cadastro completo da equipe — função, documentos, remuneração e alocação por obra."
        actions={
          <Link
            href="/pessoal/colaboradores/novo"
            className={cn(buttonVariants({ size: "default" }), "gap-2")}
          >
            <Plus className="size-4" />
            Novo colaborador
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ativos"
          value={String(counts.ativos)}
          detail={`${counts.total} colaboradores cadastrados`}
          icon={Users}
          tone="success"
        />
        <KpiCard
          label="Em férias"
          value={String(counts.ferias)}
          detail="No período atual"
          icon={Plane}
          tone="info"
        />
        <KpiCard
          label="Afastados"
          value={String(counts.afastados)}
          detail="INSS / atestado"
          icon={HeartPulse}
          tone="alert"
        />
        <KpiCard
          label="Folha base (ativos)"
          value={formatBRL(counts.folhaAtivos)}
          detail="Remuneração + ajuda de custo"
          icon={Wallet}
          tone="ok"
        />
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 h-10 w-full lg:w-96 rounded-md border bg-background px-3 text-sm">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, matrícula, cargo ou CPF…"
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
              />
            </div>
            <select
              value={obraId}
              onChange={(e) => setObraId(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="todas">Todas as obras</option>
              {OBRAS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTROS_STATUS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFiltro(f.value)}
                aria-pressed={filtro === f.value}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  filtro === f.value
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted",
                )}
              >
                {f.label}
              </button>
            ))}
            <div className="ml-auto text-xs text-muted-foreground self-center">
              {filtrados.length} de {COLABORADORES.length} colaboradores
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
                <TableHead>Cargo</TableHead>
                <TableHead>Alocação</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Admissão</TableHead>
                <TableHead className="text-right">Remuneração</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">
                    Nenhum colaborador encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((c) => {
                  const obra = c.obra_id ? obraById.get(c.obra_id) : null;
                  const statusTone = COLABORADOR_STATUS_TONE[c.status];
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-semibold">{c.nome_completo}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          mat. {c.matricula ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{c.cargo}</TableCell>
                      <TableCell>
                        <div className="text-sm">{obra?.nome ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.cidade ? `${c.cidade}/${c.estado}` : "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{formatTelefone(c.telefone)}</div>
                        <div className="text-muted-foreground">{c.email ?? "—"}</div>
                      </TableCell>
                      <TableCell className="text-xs">{formatDateBR(c.data_admissao)}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {c.remuneracao_base != null ? formatBRL(c.remuneracao_base) : "—"}
                        {c.ajuda_custo > 0 ? (
                          <div className="text-[10px] text-muted-foreground">
                            + {formatBRL(c.ajuda_custo)} ajuda
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("gap-1.5 font-medium", statusTone.bg, statusTone.text)}
                        >
                          <span className={cn("size-1.5 rounded-full", statusTone.dot)} />
                          {COLABORADOR_STATUS_LABEL[c.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => router.push(`/pessoal/colaboradores/${c.id}`)}
                            aria-label="Ver detalhes"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => router.push(`/pessoal/colaboradores/${c.id}/editar`)}
                            aria-label="Editar"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleNotImplemented("Excluir colaborador")}
                            aria-label="Excluir"
                          >
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
    </div>
  );
}

type Tone = "ok" | "info" | "alert" | "success";
const TONE_CLASSES: Record<Tone, { bg: string; text: string; dot: string }> = {
  ok: { bg: "bg-sky-50", text: "text-sky-600", dot: "bg-sky-500" },
  info: { bg: "bg-violet-50", text: "text-violet-600", dot: "bg-violet-500" },
  alert: { bg: "bg-rose-50", text: "text-rose-600", dot: "bg-rose-500" },
  success: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" },
};

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {label}
            </div>
            <div className="text-3xl font-bold mt-2">{value}</div>
          </div>
          <div className={cn("size-10 rounded-lg grid place-items-center", t.bg)}>
            <Icon className={cn("size-5", t.text)} />
          </div>
        </div>
        <div className={cn("text-xs mt-3 font-medium flex items-center gap-1", t.text)}>
          <span className={cn("size-1.5 rounded-full", t.dot)} />
          {detail}
        </div>
      </CardContent>
    </Card>
  );
}
