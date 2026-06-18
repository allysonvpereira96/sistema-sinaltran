"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, ArrowLeft, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  COLABORADOR_STATUS_LABEL,
  type Colaborador,
  type ColaboradorStatus,
  type ColaboradorDocumento,
  type ColaboradorDependente,
  type ColaboradorFerias,
  type ColaboradorAvaliacao,
  type ColaboradorOcorrencia,
  type ColaboradorComentario,
} from "@/lib/mocks/colaboradores";
import type {
  ColaboradorAso,
  ColaboradorTreinamento,
  TreinamentoCatalogo,
} from "@/lib/types/rh";
import {
  createColaborador,
  updateColaborador,
  createDependente,
  type ColaboradorInput,
  type CentroCustoResumo,
} from "@/lib/actions/colaboradores";
import { extrairFichaEmpregado } from "@/lib/actions/ficha";
import { cn } from "@/lib/utils";
import { AtualizarFichaDialog } from "./atualizar-ficha-dialog";
import { DocumentosTab } from "./documentos-tab";
import { DependentesTab } from "./dependentes-tab";
import { FeriasTab } from "./ferias-tab";
import { AsoTab } from "./aso-tab";
import { TreinamentosTab } from "./treinamentos-tab";
import { AvaliacoesTab } from "./avaliacoes-tab";
import { OcorrenciasTab } from "./ocorrencias-tab";
import { ComentariosTab } from "./comentarios-tab";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const statusValues = ["ativo", "afastado", "ferias", "desligado"] as const;
const generoValues = ["masculino", "feminino", "outro", "nao_informado"] as const;

const GENERO_LABEL: Record<(typeof generoValues)[number], string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  outro: "Outro",
  nao_informado: "Não informado",
};

const colaboradorSchema = z.object({
  nome_completo: z.string().min(3, "Informe o nome completo"),
  matricula: z.string().optional().or(z.literal("")),
  cpf: z.string().optional().or(z.literal("")),
  rg: z.string().optional().or(z.literal("")),
  data_nascimento: z.string().optional().or(z.literal("")),
  genero: z.enum(generoValues).optional().or(z.literal("")),
  pis: z.string().optional().or(z.literal("")),
  cnh: z.string().optional().or(z.literal("")),
  cnh_validade: z.string().optional().or(z.literal("")),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().optional().or(z.literal("")),
  endereco: z.string().optional().or(z.literal("")),
  cidade: z.string().optional().or(z.literal("")),
  estado: z.string().optional().or(z.literal("")),
  cep: z.string().optional().or(z.literal("")),
  cargo: z.string().min(1, "Cargo é obrigatório"),
  centro_custo_id: z.string().optional().or(z.literal("")),
  status: z.enum(statusValues),
  data_admissao: z.string().min(1, "Data de admissão é obrigatória"),
  data_desligamento: z.string().optional().or(z.literal("")),
  motivo_desligamento: z.string().optional().or(z.literal("")),
  remuneracao_base: z
    .number({ message: "Informe um valor" })
    .min(0, "Valor deve ser positivo")
    .optional(),
  ajuda_custo: z.number().min(0, "Valor deve ser positivo"),
  banco: z.string().optional().or(z.literal("")),
  agencia: z.string().optional().or(z.literal("")),
  conta: z.string().optional().or(z.literal("")),
  chave_pix: z.string().optional().or(z.literal("")),
  emergencia_nome: z.string().optional().or(z.literal("")),
  emergencia_parentesco: z.string().optional().or(z.literal("")),
  emergencia_telefone: z.string().optional().or(z.literal("")),
  observacoes: z.string().optional().or(z.literal("")),
  termo_uso_imagem: z.boolean(),
  termo_uso_imagem_data: z.string().optional().or(z.literal("")),
  manual_conduta: z.boolean(),
  manual_conduta_data: z.string().optional().or(z.literal("")),
  // Ficha de registro — filiação / dados civis
  nome_pai: z.string().optional().or(z.literal("")),
  nome_mae: z.string().optional().or(z.literal("")),
  estado_civil: z.string().optional().or(z.literal("")),
  naturalidade: z.string().optional().or(z.literal("")),
  naturalidade_uf: z.string().optional().or(z.literal("")),
  nacionalidade: z.string().optional().or(z.literal("")),
  raca_cor: z.string().optional().or(z.literal("")),
  grau_instrucao: z.string().optional().or(z.literal("")),
  // Ficha de registro — documentos trabalhistas
  ctps_numero: z.string().optional().or(z.literal("")),
  ctps_serie: z.string().optional().or(z.literal("")),
  titulo_eleitor: z.string().optional().or(z.literal("")),
  cbo: z.string().optional().or(z.literal("")),
  matricula_esocial: z.string().optional().or(z.literal("")),
  // Ficha de registro — contratuais
  insalubridade_pct: z.number().min(0).optional(),
  periculosidade_pct: z.number().min(0).optional(),
  sindicato: z.string().optional().or(z.literal("")),
  horario_trabalho: z.string().optional().or(z.literal("")),
});

export type ColaboradorFormValues = z.infer<typeof colaboradorSchema>;

type ColaboradorFormProps = {
  mode: "create" | "edit";
  initialData?: Colaborador;
  centrosCusto: CentroCustoResumo[];
  // Dados operacionais (apenas no modo edição) para as abas-filhas
  documentos?: ColaboradorDocumento[];
  dependentes?: ColaboradorDependente[];
  ferias?: ColaboradorFerias[];
  aso?: ColaboradorAso[];
  treinamentos?: ColaboradorTreinamento[];
  catalogoTreinamentos?: TreinamentoCatalogo[];
  avaliacoes?: ColaboradorAvaliacao[];
  ocorrencias?: ColaboradorOcorrencia[];
  comentarios?: ColaboradorComentario[];
};

function colaboradorToValues(c: Colaborador): ColaboradorFormValues {
  return {
    nome_completo: c.nome_completo,
    matricula: c.matricula ?? "",
    cpf: c.cpf ?? "",
    rg: c.rg ?? "",
    data_nascimento: c.data_nascimento ?? "",
    genero: c.genero ?? "",
    pis: c.pis ?? "",
    cnh: c.cnh ?? "",
    cnh_validade: c.cnh_validade ?? "",
    email: c.email ?? "",
    telefone: c.telefone ?? "",
    endereco: c.endereco ?? "",
    cidade: c.cidade ?? "",
    estado: c.estado ?? "",
    cep: c.cep ?? "",
    cargo: c.cargo,
    centro_custo_id: c.centro_custo_id ?? "",
    status: c.status,
    data_admissao: c.data_admissao,
    data_desligamento: c.data_desligamento ?? "",
    motivo_desligamento: c.motivo_desligamento ?? "",
    remuneracao_base: c.remuneracao_base ?? undefined,
    ajuda_custo: c.ajuda_custo,
    banco: c.banco ?? "",
    agencia: c.agencia ?? "",
    conta: c.conta ?? "",
    chave_pix: c.chave_pix ?? "",
    emergencia_nome: c.emergencia_nome ?? "",
    emergencia_parentesco: c.emergencia_parentesco ?? "",
    emergencia_telefone: c.emergencia_telefone ?? "",
    observacoes: c.observacoes ?? "",
    termo_uso_imagem: c.termo_uso_imagem ?? false,
    termo_uso_imagem_data: c.termo_uso_imagem_data ?? "",
    manual_conduta: c.manual_conduta ?? false,
    manual_conduta_data: c.manual_conduta_data ?? "",
    nome_pai: c.nome_pai ?? "",
    nome_mae: c.nome_mae ?? "",
    estado_civil: c.estado_civil ?? "",
    naturalidade: c.naturalidade ?? "",
    naturalidade_uf: c.naturalidade_uf ?? "",
    nacionalidade: c.nacionalidade ?? "",
    raca_cor: c.raca_cor ?? "",
    grau_instrucao: c.grau_instrucao ?? "",
    ctps_numero: c.ctps_numero ?? "",
    ctps_serie: c.ctps_serie ?? "",
    titulo_eleitor: c.titulo_eleitor ?? "",
    cbo: c.cbo ?? "",
    matricula_esocial: c.matricula_esocial ?? "",
    insalubridade_pct: c.insalubridade_pct ?? undefined,
    periculosidade_pct: c.periculosidade_pct ?? undefined,
    sindicato: c.sindicato ?? "",
    horario_trabalho: c.horario_trabalho ?? "",
  };
}

export function ColaboradorForm({
  mode,
  initialData,
  centrosCusto,
  documentos = [],
  dependentes = [],
  ferias = [],
  aso = [],
  treinamentos = [],
  catalogoTreinamentos = [],
  avaliacoes = [],
  ocorrencias = [],
  comentarios = [],
}: ColaboradorFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const fichaRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ColaboradorFormValues>({
    resolver: zodResolver(colaboradorSchema),
    defaultValues: initialData
      ? colaboradorToValues(initialData)
      : {
          nome_completo: "",
          matricula: "",
          cpf: "",
          rg: "",
          data_nascimento: "",
          genero: "",
          pis: "",
          cnh: "",
          cnh_validade: "",
          email: "",
          telefone: "",
          endereco: "",
          cidade: "",
          estado: "RS",
          cep: "",
          cargo: "",
          centro_custo_id: "",
          status: "ativo",
          data_admissao: "",
          data_desligamento: "",
          motivo_desligamento: "",
          remuneracao_base: undefined,
          ajuda_custo: 0,
          banco: "",
          agencia: "",
          conta: "",
          chave_pix: "",
          emergencia_nome: "",
          emergencia_parentesco: "",
          emergencia_telefone: "",
          observacoes: "",
          termo_uso_imagem: false,
          termo_uso_imagem_data: "",
          manual_conduta: false,
          manual_conduta_data: "",
          nome_pai: "",
          nome_mae: "",
          estado_civil: "",
          naturalidade: "",
          naturalidade_uf: "",
          nacionalidade: "",
          raca_cor: "",
          grau_instrucao: "",
          ctps_numero: "",
          ctps_serie: "",
          titulo_eleitor: "",
          cbo: "",
          matricula_esocial: "",
          insalubridade_pct: undefined,
          periculosidade_pct: undefined,
          sindicato: "",
          horario_trabalho: "",
        },
  });

  // dependentes extraídos da ficha (modo create) para salvar após criar o colaborador
  const [fichaDependentes, setFichaDependentes] = useState<
    { nome: string; parentesco?: string | null; data_nascimento?: string | null }[]
  >([]);

  useEffect(() => {
    if (initialData) reset(colaboradorToValues(initialData));
  }, [initialData, reset]);

  // Ao informar a data de desligamento, o status passa automaticamente a "Desligado".
  const dataDesligamento = useWatch({ control, name: "data_desligamento" });
  useEffect(() => {
    if (dataDesligamento && getValues("status") !== "desligado") {
      setValue("status", "desligado", { shouldDirty: true });
    }
  }, [dataDesligamento, getValues, setValue]);

  async function handleFicha(file: File) {
    setImportando(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await extrairFichaEmpregado(base64, file.type);
      if (!res.ok) {
        toast.error("Não foi possível ler a ficha", { description: res.error });
        return;
      }
      const d = res.data;
      const atual = getValues();
      const generosOk = generoValues as readonly string[];
      reset({
        ...atual,
        nome_completo: d.nome_completo || atual.nome_completo,
        matricula: d.matricula || atual.matricula,
        remuneracao_base: d.remuneracao_base ?? atual.remuneracao_base,
        cpf: d.cpf || atual.cpf,
        rg: d.rg || atual.rg,
        data_nascimento: d.data_nascimento || atual.data_nascimento,
        pis: d.pis || atual.pis,
        cargo: d.cargo || atual.cargo,
        data_admissao: d.data_admissao || atual.data_admissao,
        email: d.email || atual.email,
        telefone: d.telefone || atual.telefone,
        endereco: d.endereco || atual.endereco,
        cidade: d.cidade || atual.cidade,
        estado: d.estado || atual.estado,
        cep: d.cep || atual.cep,
        genero: d.genero && generosOk.includes(d.genero) ? (d.genero as ColaboradorFormValues["genero"]) : atual.genero,
        banco: d.banco || atual.banco,
        agencia: d.agencia || atual.agencia,
        conta: d.conta || atual.conta,
        nome_pai: d.nome_pai || atual.nome_pai,
        nome_mae: d.nome_mae || atual.nome_mae,
        estado_civil: d.estado_civil || atual.estado_civil,
        naturalidade: d.naturalidade || atual.naturalidade,
        naturalidade_uf: d.naturalidade_uf || atual.naturalidade_uf,
        nacionalidade: d.nacionalidade || atual.nacionalidade,
        raca_cor: d.raca_cor || atual.raca_cor,
        grau_instrucao: d.grau_instrucao || atual.grau_instrucao,
        ctps_numero: d.ctps_numero || atual.ctps_numero,
        ctps_serie: d.ctps_serie || atual.ctps_serie,
        titulo_eleitor: d.titulo_eleitor || atual.titulo_eleitor,
        cbo: d.cbo || atual.cbo,
        matricula_esocial: d.matricula_esocial || atual.matricula_esocial,
        insalubridade_pct: d.insalubridade_pct ?? atual.insalubridade_pct,
        periculosidade_pct: d.periculosidade_pct ?? atual.periculosidade_pct,
        sindicato: d.sindicato || atual.sindicato,
        horario_trabalho: d.horario_trabalho || atual.horario_trabalho,
      });

      // dependentes só podem ser gravados após criar o colaborador (modo create)
      const deps = (d.dependentes ?? []).filter((dep) => dep?.nome?.trim());
      if (!isEdit && deps.length) {
        setFichaDependentes(deps);
        toast.success(
          `Ficha importada — confira os campos. ${deps.length} dependente(s) serão salvos ao cadastrar.`,
        );
      } else {
        toast.success("Ficha importada — confira e ajuste os campos antes de salvar.");
      }
    } catch {
      toast.error("Falha ao ler o arquivo.");
    } finally {
      setImportando(false);
      if (fichaRef.current) fichaRef.current.value = "";
    }
  }

  const onSubmit: SubmitHandler<ColaboradorFormValues> = async (values) => {
    const desligado = Boolean(values.data_desligamento);
    const input: ColaboradorInput = {
      ...values,
      genero: values.genero || null,
      centro_custo_id: values.centro_custo_id || null,
      remuneracao_base: values.remuneracao_base ?? null,
      ajuda_custo: values.ajuda_custo ?? 0,
      // data de desligamento manda no status e no motivo
      status: desligado ? "desligado" : values.status,
      motivo_desligamento: desligado ? values.motivo_desligamento || null : null,
    };

    let novoId: string | null = null;
    let res: { ok: true } | { ok: false; error: string };
    if (isEdit && initialData) {
      res = await updateColaborador(initialData.id, input);
    } else {
      const created = await createColaborador(input);
      res = created;
      if (created.ok) novoId = created.id;
    }

    if (!res.ok) {
      toast.error("Erro ao salvar", { description: res.error });
      return;
    }

    // grava os dependentes extraídos da ficha no colaborador recém-criado
    if (novoId && fichaDependentes.length) {
      const cid = novoId;
      await Promise.all(
        fichaDependentes.map((dep) =>
          createDependente({
            colaborador_id: cid,
            nome: dep.nome,
            parentesco: dep.parentesco ?? null,
            data_nascimento: dep.data_nascimento ?? null,
          }),
        ),
      );
    }

    toast.success(isEdit ? "Colaborador atualizado" : "Colaborador cadastrado");
    router.push("/pessoal/colaboradores");
    router.refresh();
  };

  const salvar = handleSubmit(onSubmit);
  const cid = initialData?.id ?? "";

  return (
    <div className="p-6 lg:p-8 max-w-[1100px] mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <Link
          href="/pessoal/colaboradores"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          aria-label="Voltar para lista"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {isEdit ? "Editar colaborador" : "Novo colaborador"}
          </h1>
          <p className="text-sm text-muted-foreground">Preencha os dados do colaborador.</p>
        </div>
        {!isEdit && (
          <>
            <input
              ref={fichaRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFicha(e.target.files[0])}
            />
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={importando}
              onClick={() => fichaRef.current?.click()}
            >
              {importando ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {importando ? "Lendo ficha…" : "Importar ficha (PDF)"}
            </Button>
          </>
        )}
        {isEdit && initialData && (
          <AtualizarFichaDialog colaborador={initialData} dependentesAtuais={dependentes} />
        )}
        <Button type="button" disabled={isSubmitting} className="gap-2" onClick={salvar}>
          <Save className="size-4" />
          {isSubmitting ? "Salvando…" : "Salvar"}
        </Button>
      </header>

      <Tabs defaultValue="pessoais">
        <TabsList className="flex-wrap">
          <TabsTrigger value="pessoais">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="endereco">Endereço</TabsTrigger>
          <TabsTrigger value="profissionais">Profissionais</TabsTrigger>
          <TabsTrigger value="bancarios">Bancários</TabsTrigger>
          <TabsTrigger value="emergencia">Emergência</TabsTrigger>
          <TabsTrigger value="termos">Termos</TabsTrigger>
          {isEdit && (
            <>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
              <TabsTrigger value="dependentes">Dependentes</TabsTrigger>
              <TabsTrigger value="ferias">Férias</TabsTrigger>
              <TabsTrigger value="aso">ASO</TabsTrigger>
              <TabsTrigger value="treinamentos">Treinamentos</TabsTrigger>
              <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
              <TabsTrigger value="ocorrencias">Ocorrências</TabsTrigger>
              <TabsTrigger value="comentarios">Comentários</TabsTrigger>
            </>
          )}
        </TabsList>

        {/* ── Dados Pessoais ── */}
        <TabsContent value="pessoais" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
              <CardDescription>Identificação, documentos e contato</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo *" error={errors.nome_completo?.message} className="sm:col-span-2">
                <Input {...register("nome_completo")} placeholder="Nome completo do colaborador" />
              </Field>
              <Field label="CPF" error={errors.cpf?.message}>
                <Input {...register("cpf")} placeholder="Somente números" />
              </Field>
              <Field label="RG" error={errors.rg?.message}>
                <Input {...register("rg")} placeholder="RG" />
              </Field>
              <Field label="Data de nascimento" error={errors.data_nascimento?.message}>
                <Input type="date" {...register("data_nascimento")} />
              </Field>
              <Field label="Gênero" error={errors.genero?.message}>
                <NativeSelect {...register("genero")}>
                  <option value="">Selecione…</option>
                  {generoValues.map((g) => (
                    <option key={g} value={g}>
                      {GENERO_LABEL[g]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="PIS/PASEP" error={errors.pis?.message}>
                <Input {...register("pis")} placeholder="PIS" />
              </Field>
              <Field label="CNH" error={errors.cnh?.message}>
                <Input {...register("cnh")} placeholder="Número da CNH" />
              </Field>
              <Field label="Validade da CNH" error={errors.cnh_validade?.message}>
                <Input type="date" {...register("cnh_validade")} />
              </Field>
              <Field label="Telefone" error={errors.telefone?.message}>
                <Input {...register("telefone")} placeholder="(54) 99999-9999" />
              </Field>
              <Field label="E-mail" error={errors.email?.message}>
                <Input {...register("email")} placeholder="email@exemplo.com" />
              </Field>

              <Field label="Estado civil" error={errors.estado_civil?.message}>
                <Input {...register("estado_civil")} placeholder="Ex.: Casado" />
              </Field>
              <Field label="Nacionalidade" error={errors.nacionalidade?.message}>
                <Input {...register("nacionalidade")} placeholder="Ex.: Brasileira" />
              </Field>
              <Field label="Naturalidade (cidade)" error={errors.naturalidade?.message}>
                <Input {...register("naturalidade")} placeholder="Cidade de nascimento" />
              </Field>
              <Field label="UF da naturalidade" error={errors.naturalidade_uf?.message}>
                <Input {...register("naturalidade_uf")} placeholder="RS" maxLength={2} />
              </Field>
              <Field label="Raça/cor" error={errors.raca_cor?.message}>
                <Input {...register("raca_cor")} placeholder="Ex.: Branco" />
              </Field>
              <Field label="Grau de instrução" error={errors.grau_instrucao?.message}>
                <Input {...register("grau_instrucao")} placeholder="Ex.: Ensino médio completo" />
              </Field>
              <Field label="Nome do pai" error={errors.nome_pai?.message}>
                <Input {...register("nome_pai")} placeholder="Nome do pai" />
              </Field>
              <Field label="Nome da mãe" error={errors.nome_mae?.message}>
                <Input {...register("nome_mae")} placeholder="Nome da mãe" />
              </Field>
              <Field label="CTPS — número" error={errors.ctps_numero?.message}>
                <Input {...register("ctps_numero")} placeholder="Número da CTPS" />
              </Field>
              <Field label="CTPS — série" error={errors.ctps_serie?.message}>
                <Input {...register("ctps_serie")} placeholder="Série" />
              </Field>
              <Field label="Título de eleitor" error={errors.titulo_eleitor?.message}>
                <Input {...register("titulo_eleitor")} placeholder="Título de eleitor" />
              </Field>
              <Field label="Matrícula eSocial" error={errors.matricula_esocial?.message}>
                <Input {...register("matricula_esocial")} placeholder="Matrícula eSocial" />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Endereço ── */}
        <TabsContent value="endereco" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Endereço" error={errors.endereco?.message} className="sm:col-span-2">
                <Input {...register("endereco")} placeholder="Rua, número, bairro" />
              </Field>
              <Field label="Cidade" error={errors.cidade?.message}>
                <Input {...register("cidade")} placeholder="Caxias do Sul" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Estado" error={errors.estado?.message}>
                  <Input {...register("estado")} placeholder="RS" maxLength={2} />
                </Field>
                <Field label="CEP" error={errors.cep?.message}>
                  <Input {...register("cep")} placeholder="00000-000" />
                </Field>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Profissionais ── */}
        <TabsContent value="profissionais" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados Profissionais</CardTitle>
              <CardDescription>Cargo, alocação, situação e remuneração</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Matrícula" error={errors.matricula?.message}>
                <Input {...register("matricula")} placeholder="Ex.: 0042" />
              </Field>
              <Field label="Cargo *" error={errors.cargo?.message}>
                <Input {...register("cargo")} placeholder="Ex.: Pintor viário" />
              </Field>
              <Field label="Centro de custo" error={errors.centro_custo_id?.message}>
                <NativeSelect {...register("centro_custo_id")}>
                  <option value="">Sem centro de custo</option>
                  {centrosCusto.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.nome}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Status" error={errors.status?.message}>
                <NativeSelect {...register("status")}>
                  {statusValues.map((s) => (
                    <option key={s} value={s}>
                      {COLABORADOR_STATUS_LABEL[s as ColaboradorStatus]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Data de admissão *" error={errors.data_admissao?.message}>
                <Input type="date" {...register("data_admissao")} />
              </Field>
              <Field label="Data de desligamento" error={errors.data_desligamento?.message}>
                <Input type="date" {...register("data_desligamento")} />
              </Field>
              {dataDesligamento ? (
                <Field
                  label="Motivo do desligamento"
                  error={errors.motivo_desligamento?.message}
                  className="sm:col-span-2"
                >
                  <Textarea
                    rows={2}
                    {...register("motivo_desligamento")}
                    placeholder="Ex.: Pedido de demissão, dispensa sem justa causa, fim de contrato…"
                  />
                  <p className="text-xs text-muted-foreground">
                    Com a data preenchida, o status muda automaticamente para “Desligado”.
                  </p>
                </Field>
              ) : null}
              <Field label="Remuneração base" error={errors.remuneracao_base?.message}>
                <Input
                  type="number"
                  step="0.01"
                  {...register("remuneracao_base", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
                  placeholder="0,00"
                />
              </Field>
              <Field label="Auxílio Mobilidade" error={errors.ajuda_custo?.message}>
                <Input type="number" step="0.01" {...register("ajuda_custo", { valueAsNumber: true })} placeholder="0,00" />
              </Field>
              <Field label="CBO" error={errors.cbo?.message}>
                <Input {...register("cbo")} placeholder="Ex.: 9922-25" />
              </Field>
              <Field label="Sindicato" error={errors.sindicato?.message}>
                <Input {...register("sindicato")} placeholder="Sindicato da categoria" />
              </Field>
              <Field label="Insalubridade (%)" error={errors.insalubridade_pct?.message}>
                <Input
                  type="number"
                  step="0.01"
                  {...register("insalubridade_pct", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
                  placeholder="0"
                />
              </Field>
              <Field label="Periculosidade (%)" error={errors.periculosidade_pct?.message}>
                <Input
                  type="number"
                  step="0.01"
                  {...register("periculosidade_pct", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
                  placeholder="0"
                />
              </Field>
              <Field label="Horário de trabalho" error={errors.horario_trabalho?.message} className="sm:col-span-2">
                <Input {...register("horario_trabalho")} placeholder="Ex.: Seg a Sex 07:30-12:00 / 13:00-17:18" />
              </Field>
              <Field label="Observações" error={errors.observacoes?.message} className="sm:col-span-2">
                <Textarea rows={3} {...register("observacoes")} placeholder="Informações relevantes sobre o colaborador" />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Bancários ── */}
        <TabsContent value="bancarios" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados Bancários</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Banco" error={errors.banco?.message}>
                <Input {...register("banco")} placeholder="Ex.: Banrisul" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Agência" error={errors.agencia?.message}>
                  <Input {...register("agencia")} placeholder="0000" />
                </Field>
                <Field label="Conta" error={errors.conta?.message}>
                  <Input {...register("conta")} placeholder="00000-0" />
                </Field>
              </div>
              <Field label="Chave PIX" error={errors.chave_pix?.message} className="sm:col-span-2">
                <Input {...register("chave_pix")} placeholder="CPF, e-mail, telefone ou aleatória" />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Emergência ── */}
        <TabsContent value="emergencia" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Contato de Emergência</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field label="Nome" error={errors.emergencia_nome?.message}>
                <Input {...register("emergencia_nome")} placeholder="Nome do contato" />
              </Field>
              <Field label="Parentesco" error={errors.emergencia_parentesco?.message}>
                <Input {...register("emergencia_parentesco")} placeholder="Ex.: Esposa" />
              </Field>
              <Field label="Telefone" error={errors.emergencia_telefone?.message}>
                <Input {...register("emergencia_telefone")} placeholder="(54) 99999-9999" />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Termos ── */}
        <TabsContent value="termos" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Termos</CardTitle>
              <CardDescription>Autorizações e ciência do colaborador</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" className="size-4 rounded border-input" {...register("termo_uso_imagem")} />
                  Termo de uso de imagem
                </label>
                <Field label="Data de assinatura" error={errors.termo_uso_imagem_data?.message}>
                  <Input type="date" {...register("termo_uso_imagem_data")} />
                </Field>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" className="size-4 rounded border-input" {...register("manual_conduta")} />
                  Manual de conduta (ciência)
                </label>
                <Field label="Data de ciência" error={errors.manual_conduta_data?.message}>
                  <Input type="date" {...register("manual_conduta_data")} />
                </Field>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Abas operacionais (somente edição) ── */}
        {isEdit && (
          <>
            <TabsContent value="documentos" className="pt-4">
              <DocumentosTab colaboradorId={cid} documentos={documentos} />
            </TabsContent>
            <TabsContent value="dependentes" className="pt-4">
              <DependentesTab colaboradorId={cid} dependentes={dependentes} />
            </TabsContent>
            <TabsContent value="ferias" className="pt-4">
              <FeriasTab colaboradorId={cid} ferias={ferias} />
            </TabsContent>
            <TabsContent value="aso" className="pt-4">
              <AsoTab colaboradorId={cid} aso={aso} />
            </TabsContent>
            <TabsContent value="treinamentos" className="pt-4">
              <TreinamentosTab colaboradorId={cid} treinamentos={treinamentos} catalogo={catalogoTreinamentos} />
            </TabsContent>
            <TabsContent value="avaliacoes" className="pt-4">
              <AvaliacoesTab colaboradorId={cid} avaliacoes={avaliacoes} />
            </TabsContent>
            <TabsContent value="ocorrencias" className="pt-4">
              <OcorrenciasTab
                colaboradorId={cid}
                ocorrencias={ocorrencias}
                remuneracaoAtual={initialData?.remuneracao_base ?? null}
                cargoAtual={initialData?.cargo ?? null}
              />
            </TabsContent>
            <TabsContent value="comentarios" className="pt-4">
              <ComentariosTab colaboradorId={cid} comentarios={comentarios} />
            </TabsContent>
          </>
        )}
      </Tabs>

      <div className="flex items-center justify-end gap-3">
        <Link href="/pessoal/colaboradores" className={cn(buttonVariants({ variant: "outline" }))}>
          Cancelar
        </Link>
        <Button type="button" disabled={isSubmitting} className="gap-2" onClick={salvar}>
          <Save className="size-4" />
          {isSubmitting ? "Salvando…" : isEdit ? "Salvar alterações" : "Cadastrar colaborador"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-rose-600 font-medium">{error}</p> : null}
    </div>
  );
}

const NativeSelect = ({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={cn(
      "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      className,
    )}
  >
    {children}
  </select>
);
