"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
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
import {
  COLABORADOR_STATUS_LABEL,
  type Colaborador,
  type ColaboradorStatus,
} from "@/lib/mocks/colaboradores";
import {
  createColaborador,
  updateColaborador,
  type ColaboradorInput,
  type ObraResumo,
} from "@/lib/actions/colaboradores";
import { extrairFichaEmpregado } from "@/lib/actions/ficha";
import { cn } from "@/lib/utils";

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
  obra_id: z.string().optional().or(z.literal("")),
  status: z.enum(statusValues),
  data_admissao: z.string().min(1, "Data de admissão é obrigatória"),
  data_desligamento: z.string().optional().or(z.literal("")),
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
});

export type ColaboradorFormValues = z.infer<typeof colaboradorSchema>;

type ColaboradorFormProps = {
  mode: "create" | "edit";
  initialData?: Colaborador;
  obras: ObraResumo[];
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
    obra_id: c.obra_id ?? "",
    status: c.status,
    data_admissao: c.data_admissao,
    data_desligamento: c.data_desligamento ?? "",
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
  };
}

export function ColaboradorForm({ mode, initialData, obras }: ColaboradorFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const fichaRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
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
          obra_id: "",
          status: "ativo",
          data_admissao: "",
          data_desligamento: "",
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
        },
  });

  useEffect(() => {
    if (initialData) reset(colaboradorToValues(initialData));
  }, [initialData, reset]);

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
      });
      toast.success("Ficha importada — confira e ajuste os campos antes de salvar.");
    } catch {
      toast.error("Falha ao ler o arquivo.");
    } finally {
      setImportando(false);
      if (fichaRef.current) fichaRef.current.value = "";
    }
  }

  const onSubmit: SubmitHandler<ColaboradorFormValues> = async (values) => {
    const input: ColaboradorInput = {
      ...values,
      genero: values.genero || null,
      obra_id: values.obra_id || null,
      remuneracao_base: values.remuneracao_base ?? null,
      ajuda_custo: values.ajuda_custo ?? 0,
    };

    const res =
      isEdit && initialData
        ? await updateColaborador(initialData.id, input)
        : await createColaborador(input);

    if (!res.ok) {
      toast.error("Erro ao salvar", { description: res.error });
      return;
    }
    toast.success(isEdit ? "Colaborador atualizado" : "Colaborador cadastrado");
    router.push("/pessoal/colaboradores");
    router.refresh();
  };

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
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Atualize os dados cadastrais do colaborador."
              : "Cadastre um novo colaborador. Após salvar, será possível anexar documentos, dependentes e registrar férias."}
          </p>
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
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados pessoais</CardTitle>
            <CardDescription>Identificação e documentos</CardDescription>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
            <CardDescription>Telefone, e-mail e endereço</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefone" error={errors.telefone?.message}>
              <Input {...register("telefone")} placeholder="(54) 99999-9999" />
            </Field>
            <Field label="E-mail" error={errors.email?.message}>
              <Input {...register("email")} placeholder="email@exemplo.com" />
            </Field>
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

        <Card>
          <CardHeader>
            <CardTitle>Dados profissionais</CardTitle>
            <CardDescription>Cargo, alocação e situação</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Matrícula" error={errors.matricula?.message}>
              <Input {...register("matricula")} placeholder="Ex.: 0042" />
            </Field>
            <Field label="Cargo *" error={errors.cargo?.message}>
              <Input {...register("cargo")} placeholder="Ex.: Pintor viário" />
            </Field>
            <Field label="Obra (alocação)" error={errors.obra_id?.message}>
              <NativeSelect {...register("obra_id")}>
                <option value="">Sem alocação</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Remuneração e dados bancários</CardTitle>
            <CardDescription>Salário base, ajuda de custo e conta</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Remuneração base" error={errors.remuneracao_base?.message}>
              <Input
                type="number"
                step="0.01"
                {...register("remuneracao_base", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
                placeholder="0,00"
              />
            </Field>
            <Field label="Ajuda de custo" error={errors.ajuda_custo?.message}>
              <Input
                type="number"
                step="0.01"
                {...register("ajuda_custo", { valueAsNumber: true })}
                placeholder="0,00"
              />
            </Field>
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

        <Card>
          <CardHeader>
            <CardTitle>Contato de emergência</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea rows={4} {...register("observacoes")} placeholder="Informações relevantes sobre o colaborador" />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link href="/pessoal/colaboradores" className={cn(buttonVariants({ variant: "outline" }))}>
            Cancelar
          </Link>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save className="size-4" />
            {isSubmitting ? "Salvando…" : isEdit ? "Salvar alterações" : "Cadastrar colaborador"}
          </Button>
        </div>
      </form>
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
