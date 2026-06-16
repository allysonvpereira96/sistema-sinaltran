"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, ArrowLeft } from "lucide-react";
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
  createMaterial,
  updateMaterial,
  type MaterialInput,
} from "@/lib/actions/materiais";
import {
  MATERIAL_CATEGORIA_LABEL,
  type MaterialCategoria,
  type MaterialRow,
} from "@/lib/types/material";
import { cn } from "@/lib/utils";

const BASE_PATH = "/cadastros/materiais";

const categoriaValues = Object.keys(
  MATERIAL_CATEGORIA_LABEL,
) as MaterialCategoria[];

const materialSchema = z.object({
  codigo: z.string().optional().or(z.literal("")),
  descricao: z.string().min(2, "Informe a descrição do material"),
  familia: z.string().optional().or(z.literal("")),
  categoria: z.enum(categoriaValues as [MaterialCategoria, ...MaterialCategoria[]]),
  unidade_medida: z.string().optional().or(z.literal("")),
  unidade_fornecedor: z.string().optional().or(z.literal("")),
  valor_referencia: z.number().min(0, "Valor inválido"),
  valor_mao_obra: z.number().min(0, "Valor inválido"),
  ncm: z.string().optional().or(z.literal("")),
  classificacao: z.string().optional().or(z.literal("")),
  peso: z.string().optional().or(z.literal("")),
  fornecedores: z.string().optional().or(z.literal("")),
  estoque_minimo: z.number().min(0, "Valor inválido"),
  observacoes: z.string().optional().or(z.literal("")),
  ativo: z.boolean(),
});

type MaterialFormValues = z.infer<typeof materialSchema>;

function rowToValues(m: MaterialRow): MaterialFormValues {
  return {
    codigo: m.codigo ?? "",
    descricao: m.descricao,
    familia: m.familia ?? "",
    categoria: m.categoria,
    unidade_medida: m.unidade_medida ?? "",
    unidade_fornecedor: m.unidade_fornecedor ?? "",
    valor_referencia: m.valor_referencia ?? 0,
    valor_mao_obra: m.valor_mao_obra ?? 0,
    ncm: m.ncm ?? "",
    classificacao: m.classificacao ?? "",
    peso: m.peso ?? "",
    fornecedores: m.fornecedores ?? "",
    estoque_minimo: m.estoque_minimo ?? 0,
    observacoes: m.observacoes ?? "",
    ativo: m.ativo,
  };
}

export function MaterialForm({
  mode,
  initialData,
  codigoSugerido,
}: {
  mode: "create" | "edit";
  initialData?: MaterialRow;
  codigoSugerido?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: initialData
      ? rowToValues(initialData)
      : {
          codigo: codigoSugerido ?? "",
          descricao: "",
          familia: "",
          categoria: "outro",
          unidade_medida: "UN",
          unidade_fornecedor: "",
          valor_referencia: 0,
          valor_mao_obra: 0,
          ncm: "",
          classificacao: "",
          peso: "",
          fornecedores: "",
          estoque_minimo: 0,
          observacoes: "",
          ativo: true,
        },
  });

  const onSubmit: SubmitHandler<MaterialFormValues> = async (values) => {
    const input: MaterialInput = {
      codigo: values.codigo || null,
      descricao: values.descricao,
      familia: values.familia || null,
      categoria: values.categoria,
      unidade_medida: values.unidade_medida || "UN",
      unidade_fornecedor: values.unidade_fornecedor || null,
      valor_referencia: values.valor_referencia,
      valor_mao_obra: values.valor_mao_obra,
      ncm: values.ncm || null,
      classificacao: values.classificacao || null,
      peso: values.peso || null,
      fornecedores: values.fornecedores || null,
      estoque_minimo: values.estoque_minimo,
      observacoes: values.observacoes || null,
      ativo: values.ativo,
    };

    const res =
      isEdit && initialData
        ? await updateMaterial(initialData.id, input)
        : await createMaterial(input);

    if (!res.ok) {
      toast.error("Erro ao salvar", { description: res.error });
      return;
    }
    toast.success(isEdit ? "Material atualizado" : "Material cadastrado");
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
            {isEdit ? "Editar material" : "Novo material"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Atualize descrição, unidade, preços e dados do produto."
              : "Cadastre um produto. Defina o preço de material e, se houver, o de instalação (mão de obra)."}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
            <CardDescription>Código, descrição e família</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Código" error={errors.codigo?.message}>
              <Input {...register("codigo")} placeholder="PRD00001" />
            </Field>
            <Field label="Família" error={errors.familia?.message}>
              <Input
                {...register("familia")}
                placeholder="Ex.: Sinalização vertical"
              />
            </Field>
            <Field
              label="Descrição *"
              error={errors.descricao?.message}
              className="sm:col-span-2"
            >
              <Input
                {...register("descricao")}
                placeholder="Ex.: Placa em chapa de aço 1,25mm, película GTP I, R-1"
              />
            </Field>
            <Field label="Categoria" error={errors.categoria?.message}>
              <NativeSelect {...register("categoria")}>
                {categoriaValues.map((c) => (
                  <option key={c} value={c}>
                    {MATERIAL_CATEGORIA_LABEL[c]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Classificação" error={errors.classificacao?.message}>
              <Input
                {...register("classificacao")}
                placeholder="Ex.: Mercadoria para revenda"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preços de referência</CardTitle>
            <CardDescription>
              Material e mão de obra de instalação (usados no orçamento)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Preço do material (R$)"
              error={errors.valor_referencia?.message}
            >
              <Input
                type="number"
                step="0.01"
                {...register("valor_referencia", { valueAsNumber: true })}
                placeholder="0,00"
                className="text-right tabular-nums"
              />
            </Field>
            <Field
              label="Instalação / mão de obra (R$)"
              error={errors.valor_mao_obra?.message}
            >
              <Input
                type="number"
                step="0.01"
                {...register("valor_mao_obra", { valueAsNumber: true })}
                placeholder="0,00"
                className="text-right tabular-nums"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unidades e estoque</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Unidade (Sinaltran)" error={errors.unidade_medida?.message}>
              <Input {...register("unidade_medida")} placeholder="UN, M², KG, L…" />
            </Field>
            <Field
              label="Unidade do fornecedor"
              error={errors.unidade_fornecedor?.message}
            >
              <Input
                {...register("unidade_fornecedor")}
                placeholder="Ex.: Caixa, Tambor…"
              />
            </Field>
            <Field label="Estoque mínimo" error={errors.estoque_minimo?.message}>
              <Input
                type="number"
                step="0.001"
                {...register("estoque_minimo", { valueAsNumber: true })}
                placeholder="0"
                className="text-right tabular-nums"
              />
            </Field>
            <Field label="Peso" error={errors.peso?.message}>
              <Input {...register("peso")} placeholder="Ex.: 2,2 kg" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fiscal e fornecedores</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="NCM" error={errors.ncm?.message}>
              <Input {...register("ncm")} placeholder="Ex.: 39079911" />
            </Field>
            <Field label="Fornecedores" error={errors.fornecedores?.message}>
              <Input
                {...register("fornecedores")}
                placeholder="Ex.: MJC, HD Sinalizações"
              />
            </Field>
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
              placeholder="Notas internas, embalagem, conversão de unidade…"
            />
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                {...register("ativo")}
              />
              Material ativo
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
                : "Cadastrar material"}
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
