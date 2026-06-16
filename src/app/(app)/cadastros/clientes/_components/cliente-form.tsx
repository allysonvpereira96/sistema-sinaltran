"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, ArrowLeft, Search, Loader2 } from "lucide-react";
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
import { createCliente, updateCliente, lookupCnpj } from "@/lib/actions/clientes";
import type { ClienteRow } from "@/lib/types/cliente";
import { cn } from "@/lib/utils";

const BASE_PATH = "/cadastros/clientes";

const tipoValues = ["juridica", "fisica", "publico"] as const;
const TIPO_LABEL: Record<(typeof tipoValues)[number], string> = {
  juridica: "Pessoa jurídica",
  fisica: "Pessoa física",
  publico: "Órgão público",
};

const clienteSchema = z.object({
  cnpj_cpf: z.string().optional().or(z.literal("")),
  razao_social: z.string().min(2, "Informe a razão social / nome"),
  nome_fantasia: z.string().optional().or(z.literal("")),
  tipo_pessoa: z.enum(tipoValues),
  responsavel: z.string().optional().or(z.literal("")),
  telefone: z.string().optional().or(z.literal("")),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  endereco: z.string().optional().or(z.literal("")),
  cidade: z.string().optional().or(z.literal("")),
  estado: z.string().max(2, "UF tem 2 letras").optional().or(z.literal("")),
  cep: z.string().optional().or(z.literal("")),
  observacoes: z.string().optional().or(z.literal("")),
  ativo: z.boolean(),
});

type ClienteFormValues = z.infer<typeof clienteSchema>;

type ClienteFormProps = {
  mode: "create" | "edit";
  initialData?: ClienteRow;
};

function rowToValues(c: ClienteRow): ClienteFormValues {
  return {
    cnpj_cpf: c.cnpj_cpf ?? "",
    razao_social: c.razao_social,
    nome_fantasia: c.nome_fantasia ?? "",
    tipo_pessoa: c.tipo_pessoa,
    responsavel: c.responsavel ?? "",
    telefone: c.telefone ?? "",
    email: c.email ?? "",
    endereco: c.endereco ?? "",
    cidade: c.cidade ?? "",
    estado: c.estado ?? "",
    cep: c.cep ?? "",
    observacoes: c.observacoes ?? "",
    ativo: c.ativo,
  };
}

export function ClienteForm({ mode, initialData }: ClienteFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [buscando, setBuscando] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: initialData
      ? rowToValues(initialData)
      : {
          cnpj_cpf: "",
          razao_social: "",
          nome_fantasia: "",
          tipo_pessoa: "juridica",
          responsavel: "",
          telefone: "",
          email: "",
          endereco: "",
          cidade: "",
          estado: "RS",
          cep: "",
          observacoes: "",
          ativo: true,
        },
  });

  async function handleBuscaCnpj() {
    const cnpj = getValues("cnpj_cpf") ?? "";
    if (!cnpj.trim()) {
      toast.info("Informe o CNPJ para buscar.");
      return;
    }
    setBuscando(true);
    try {
      const res = await lookupCnpj(cnpj);
      if (!res) {
        toast.error("CNPJ não encontrado ou inválido.");
        return;
      }
      const atual = getValues();
      reset({
        ...atual,
        cnpj_cpf: res.cnpj,
        razao_social: res.razao_social || atual.razao_social,
        nome_fantasia: res.nome_fantasia || atual.nome_fantasia,
        email: res.email || atual.email,
        telefone: res.telefone || atual.telefone,
        endereco: res.endereco || atual.endereco,
        cidade: res.cidade || atual.cidade,
        estado: res.estado || atual.estado,
        cep: res.cep || atual.cep,
      });
      toast.success("Dados preenchidos pela Receita — confira antes de salvar.");
    } catch {
      toast.error("Falha ao consultar o CNPJ.");
    } finally {
      setBuscando(false);
    }
  }

  const onSubmit: SubmitHandler<ClienteFormValues> = async (values) => {
    const input = {
      razao_social: values.razao_social,
      nome_fantasia: values.nome_fantasia || null,
      cnpj_cpf: values.cnpj_cpf || null,
      tipo_pessoa: values.tipo_pessoa,
      responsavel: values.responsavel || null,
      telefone: values.telefone || null,
      email: values.email || null,
      endereco: values.endereco || null,
      cidade: values.cidade || null,
      estado: values.estado || null,
      cep: values.cep || null,
      observacoes: values.observacoes || null,
      ativo: values.ativo,
    };

    const res =
      isEdit && initialData
        ? await updateCliente(initialData.id, input)
        : await createCliente(input);

    if (!res.ok) {
      toast.error("Erro ao salvar", { description: res.error });
      return;
    }
    toast.success(isEdit ? "Cliente atualizado" : "Cliente cadastrado");
    router.push(BASE_PATH);
    router.refresh();
  };

  return (
    <div className="p-6 lg:p-8 max-w-[900px] mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <Link
          href={BASE_PATH}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          aria-label="Voltar para lista"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {isEdit ? "Editar cliente" : "Novo cliente"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Atualize os dados cadastrais do cliente."
              : "Cadastre um contratante. Informe o CNPJ para preencher automaticamente."}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
            <CardDescription>Documento, razão social e tipo</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="CNPJ / CPF" error={errors.cnpj_cpf?.message}>
              <div className="flex gap-2">
                <Input {...register("cnpj_cpf")} placeholder="Somente números" />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 gap-2"
                  disabled={buscando}
                  onClick={handleBuscaCnpj}
                >
                  {buscando ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  Buscar
                </Button>
              </div>
            </Field>
            <Field label="Tipo de pessoa" error={errors.tipo_pessoa?.message}>
              <NativeSelect {...register("tipo_pessoa")}>
                {tipoValues.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_LABEL[t]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Razão social / Nome *" error={errors.razao_social?.message}>
              <Input {...register("razao_social")} placeholder="Razão social do cliente" />
            </Field>
            <Field label="Nome fantasia" error={errors.nome_fantasia?.message}>
              <Input {...register("nome_fantasia")} placeholder="Nome fantasia" />
            </Field>
            <Field
              label="Responsável / Contato"
              error={errors.responsavel?.message}
              className="sm:col-span-2"
            >
              <Input
                {...register("responsavel")}
                placeholder="Ex.: Secretaria de Mobilidade, Eng. responsável…"
              />
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
              <Input {...register("email")} placeholder="contato@cliente.com.br" />
            </Field>
            <Field
              label="Endereço"
              error={errors.endereco?.message}
              className="sm:col-span-2"
            >
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
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              rows={3}
              {...register("observacoes")}
              placeholder="Informações relevantes sobre o cliente"
            />
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                {...register("ativo")}
              />
              Cliente ativo
            </label>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link href={BASE_PATH} className={cn(buttonVariants({ variant: "outline" }))}>
            Cancelar
          </Link>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save className="size-4" />
            {isSubmitting
              ? "Salvando…"
              : isEdit
                ? "Salvar alterações"
                : "Cadastrar cliente"}
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
