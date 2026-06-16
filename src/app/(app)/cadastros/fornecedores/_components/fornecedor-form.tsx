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
import {
  createFornecedor,
  updateFornecedor,
  type FornecedorInput,
} from "@/lib/actions/fornecedores";
import { lookupCnpj } from "@/lib/actions/clientes";
import type { FornecedorRow } from "@/lib/types/fornecedor";
import { cn } from "@/lib/utils";

const BASE_PATH = "/cadastros/fornecedores";

const fornecedorSchema = z.object({
  cnpj_cpf: z.string().optional().or(z.literal("")),
  nome: z.string().min(2, "Informe o nome / razão social"),
  nome_fantasia: z.string().optional().or(z.literal("")),
  telefone: z.string().optional().or(z.literal("")),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  endereco: z.string().optional().or(z.literal("")),
  cidade: z.string().optional().or(z.literal("")),
  estado: z.string().max(2, "UF tem 2 letras").optional().or(z.literal("")),
  cep: z.string().optional().or(z.literal("")),
  observacoes: z.string().optional().or(z.literal("")),
  ativo: z.boolean(),
});

type FornecedorFormValues = z.infer<typeof fornecedorSchema>;

type FornecedorFormProps = {
  mode: "create" | "edit";
  initialData?: FornecedorRow;
};

function rowToValues(f: FornecedorRow): FornecedorFormValues {
  return {
    cnpj_cpf: f.cnpj_cpf ?? "",
    nome: f.nome,
    nome_fantasia: f.nome_fantasia ?? "",
    telefone: f.telefone ?? "",
    email: f.email ?? "",
    endereco: f.endereco ?? "",
    cidade: f.cidade ?? "",
    estado: f.estado ?? "",
    cep: f.cep ?? "",
    observacoes: f.observacoes ?? "",
    ativo: f.ativo,
  };
}

export function FornecedorForm({ mode, initialData }: FornecedorFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [buscando, setBuscando] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FornecedorFormValues>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: initialData
      ? rowToValues(initialData)
      : {
          cnpj_cpf: "",
          nome: "",
          nome_fantasia: "",
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
        nome: res.razao_social || atual.nome,
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

  const onSubmit: SubmitHandler<FornecedorFormValues> = async (values) => {
    const input: FornecedorInput = {
      nome: values.nome,
      nome_fantasia: values.nome_fantasia || null,
      cnpj_cpf: values.cnpj_cpf || null,
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
        ? await updateFornecedor(initialData.id, input)
        : await createFornecedor(input);

    if (!res.ok) {
      toast.error("Erro ao salvar", { description: res.error });
      return;
    }
    toast.success(isEdit ? "Fornecedor atualizado" : "Fornecedor cadastrado");
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
            {isEdit ? "Editar fornecedor" : "Novo fornecedor"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Atualize os dados cadastrais do fornecedor."
              : "Cadastre um fornecedor de materiais ou serviços. Informe o CNPJ para preencher automaticamente."}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
            <CardDescription>Documento, razão social e nome fantasia</CardDescription>
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
            <Field label="Nome / Razão social *" error={errors.nome?.message}>
              <Input {...register("nome")} placeholder="Razão social do fornecedor" />
            </Field>
            <Field
              label="Nome fantasia"
              error={errors.nome_fantasia?.message}
              className="sm:col-span-2"
            >
              <Input {...register("nome_fantasia")} placeholder="Nome fantasia" />
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
              <Input {...register("email")} placeholder="contato@fornecedor.com.br" />
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
              placeholder="Informações relevantes sobre o fornecedor"
            />
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                {...register("ativo")}
              />
              Fornecedor ativo
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
                : "Cadastrar fornecedor"}
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
