import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  CalendarDays,
  Wallet,
  HeartPulse,
  FileText,
  Users,
  History,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  COLABORADOR_STATUS_LABEL,
  COLABORADOR_STATUS_TONE,
  HISTORICO_TIPO_LABEL,
} from "@/lib/mocks/colaboradores";
import {
  getColaboradorById,
  listObrasResumo,
  listDocumentos,
  listDependentes,
  listFerias,
  listHistorico,
  listComentarios,
  listOcorrencias,
  listAvaliacoes,
  listAso,
  listTreinamentos,
  listTreinamentosCatalogo,
} from "@/lib/actions/colaboradores";
import { formatBRL, formatDateBR, formatTelefone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DocumentosTab } from "../_components/documentos-tab";
import { DependentesTab } from "../_components/dependentes-tab";
import { FeriasTab } from "../_components/ferias-tab";
import { AsoTab } from "../_components/aso-tab";
import { TreinamentosTab } from "../_components/treinamentos-tab";
import { ComentariosTab } from "../_components/comentarios-tab";
import { OcorrenciasTab } from "../_components/ocorrencias-tab";
import { AvaliacoesTab } from "../_components/avaliacoes-tab";

export default async function ColaboradorDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getColaboradorById(id);
  if (!c) notFound();

  const [obras, documentos, dependentes, ferias, historico, comentarios, ocorrencias, avaliacoes, aso, treinamentos, catalogoTreinamentos] =
    await Promise.all([
      listObrasResumo(),
      listDocumentos(id),
      listDependentes(id),
      listFerias(id),
      listHistorico(id),
      listComentarios(id),
      listOcorrencias(id),
      listAvaliacoes(id),
      listAso(id),
      listTreinamentos(id),
      listTreinamentosCatalogo(),
    ]);

  const obra = c.obra_id ? obras.find((o) => o.id === c.obra_id) : null;
  const statusTone = COLABORADOR_STATUS_TONE[c.status];
  const historicoOrdenado = [...historico].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/pessoal/colaboradores"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            aria-label="Voltar"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={cn("gap-1.5 font-medium", statusTone.bg, statusTone.text)}>
                <span className={cn("size-1.5 rounded-full", statusTone.dot)} />
                {COLABORADOR_STATUS_LABEL[c.status]}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">mat. {c.matricula ?? "—"}</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-2">{c.nome_completo}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {c.cargo}
              {obra ? ` · ${obra.nome}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/pessoal/colaboradores/${c.id}/editar`} className={cn(buttonVariants({}), "gap-2")}>
            <Pencil className="size-4" />
            Editar e gerenciar
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Admissão" value={formatDateBR(c.data_admissao)} detail="Data de entrada" icon={CalendarDays} />
        <KpiCard
          label="Remuneração base"
          value={c.remuneracao_base != null ? formatBRL(c.remuneracao_base) : "—"}
          detail={(c.ajuda_custo ?? 0) > 0 ? `+ ${formatBRL(c.ajuda_custo ?? 0)} ajuda de custo` : "Sem ajuda de custo"}
          icon={Wallet}
        />
        <KpiCard label="Dependentes" value={String(dependentes.length)} detail="Cadastrados" icon={Users} />
        <KpiCard label="Documentos" value={String(documentos.length)} detail="Anexados" icon={FileText} />
      </div>

      <Tabs defaultValue="resumo">
        <TabsList className="flex-wrap">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="dependentes">Dependentes</TabsTrigger>
          <TabsTrigger value="ferias">Férias</TabsTrigger>
          <TabsTrigger value="aso">ASO</TabsTrigger>
          <TabsTrigger value="treinamentos">Treinamentos</TabsTrigger>
          <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
          <TabsTrigger value="ocorrencias">Ocorrências</TabsTrigger>
          <TabsTrigger value="comentarios">Comentários</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Dados pessoais e contato</CardTitle>
                <CardDescription>Informações cadastrais</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <InfoRow icon={Briefcase} label="Cargo" value={c.cargo} />
                <InfoRow icon={MapPin} label="Alocação" value={obra?.nome ?? "Sem alocação"} />
                <InfoRow icon={Phone} label="Telefone" value={formatTelefone(c.telefone)} />
                <InfoRow icon={Mail} label="E-mail" value={c.email ?? "—"} />
                <InfoRow
                  icon={MapPin}
                  label="Endereço"
                  value={c.endereco ? `${c.endereco}${c.cidade ? ` · ${c.cidade}/${c.estado}` : ""}` : "—"}
                />
                <InfoRow icon={CalendarDays} label="Nascimento" value={formatDateBR(c.data_nascimento)} />
                <InfoRow icon={FileText} label="CPF" value={c.cpf ?? "—"} />
                <InfoRow icon={FileText} label="RG" value={c.rg ?? "—"} />
                <InfoRow icon={FileText} label="PIS/PASEP" value={c.pis ?? "—"} />
                <InfoRow
                  icon={FileText}
                  label="CNH"
                  value={c.cnh ? `${c.cnh}${c.cnh_validade ? ` (val. ${formatDateBR(c.cnh_validade)})` : ""}` : "—"}
                />
                {c.observacoes ? (
                  <div className="sm:col-span-2">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Observações</div>
                    <p className="text-sm leading-relaxed">{c.observacoes}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Remuneração</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <KeyVal label="Salário base" value={c.remuneracao_base != null ? formatBRL(c.remuneracao_base) : "—"} />
                  <KeyVal label="Ajuda de custo" value={formatBRL(c.ajuda_custo ?? 0)} />
                  <KeyVal label="Banco" value={c.banco ?? "—"} />
                  <KeyVal label="Agência / Conta" value={c.agencia || c.conta ? `${c.agencia ?? "—"} / ${c.conta ?? "—"}` : "—"} />
                  <KeyVal label="Chave PIX" value={c.chave_pix ?? "—"} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HeartPulse className="size-4 text-rose-500" />
                    Emergência
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <KeyVal label="Nome" value={c.emergencia_nome ?? "—"} />
                  <KeyVal label="Parentesco" value={c.emergencia_parentesco ?? "—"} />
                  <KeyVal label="Telefone" value={formatTelefone(c.emergencia_telefone)} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documentos" className="pt-4">
          <DocumentosTab colaboradorId={c.id} documentos={documentos} readOnly />
        </TabsContent>

        <TabsContent value="dependentes" className="pt-4">
          <DependentesTab colaboradorId={c.id} dependentes={dependentes} readOnly />
        </TabsContent>

        <TabsContent value="ferias" className="pt-4">
          <FeriasTab colaboradorId={c.id} ferias={ferias} readOnly />
        </TabsContent>

        <TabsContent value="aso" className="pt-4">
          <AsoTab colaboradorId={c.id} aso={aso} readOnly />
        </TabsContent>

        <TabsContent value="treinamentos" className="pt-4">
          <TreinamentosTab colaboradorId={c.id} treinamentos={treinamentos} catalogo={catalogoTreinamentos} readOnly />
        </TabsContent>

        <TabsContent value="avaliacoes" className="pt-4">
          <AvaliacoesTab colaboradorId={c.id} avaliacoes={avaliacoes} readOnly />
        </TabsContent>

        <TabsContent value="ocorrencias" className="pt-4">
          <OcorrenciasTab colaboradorId={c.id} ocorrencias={ocorrencias} readOnly />
        </TabsContent>

        <TabsContent value="comentarios" className="pt-4">
          <ComentariosTab colaboradorId={c.id} comentarios={comentarios} readOnly />
        </TabsContent>

        <TabsContent value="historico" className="pt-4">
          <Card>
            <CardContent className="p-5">
              {historicoOrdenado.length === 0 ? (
                <EmptyState icon={History} text="Sem movimentações registradas." />
              ) : (
                <ol className="relative border-l border-border ml-2 space-y-5">
                  {historicoOrdenado.map((h) => (
                    <li key={h.id} className="ml-5">
                      <span className="absolute -left-1.5 size-3 rounded-full bg-primary" />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{formatDateBR(h.data)}</span>
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          {HISTORICO_TIPO_LABEL[h.tipo]}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1">{h.descricao}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
            <div className="text-xl font-bold mt-2 tabular-nums truncate">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{detail}</div>
          </div>
          <div className="size-10 rounded-lg bg-muted grid place-items-center shrink-0">
            <Icon className="size-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-9 rounded-md bg-muted grid place-items-center shrink-0">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className="text-sm font-medium break-words">{value}</div>
      </div>
    </div>
  );
}

function KeyVal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      <span className="text-sm font-medium text-right break-words">{value}</span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <Icon className="size-8 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
