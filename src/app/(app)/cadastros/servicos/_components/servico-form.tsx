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
  createServico,
  updateServico,
  type ServicoInput,
} from "@/lib/actions/servicos";
import { UNIDADES_SERVICO, type ServicoRow } from "@/lib/types/servico";
import { cn } from "@/lib/utils";

const BASE_PATH = "/cadastros/servicos";

const servicoSchema = z.object({
  codigo: z.string().optional().or(z.literal("")),
  descricao: z.string().min(2, "Informe a descrição do serviço"),
  descricao_completa: z.string().optional().or(z.literal("")),
  categoria: z.string().optional().or(z.literal("")),
  unidade_padrao: z.string().optional().or(z.literal("")),
  preco_unitario: z.number().min(0, "Valor inválido"),
  codigo_lc116: z.string().optional().or(z.literal("")),
  codigo_municipio: z.string().optional().or(z.literal("")),
  aliquota_iss: z.number().min(0, "Inválido").max(100, "Máx. 100"),
  retem_iss: z.boolean(),
  observacoes: z.string().optional().or(z.literal("")),
  ativo: z.boolean(),
});

type ServicoFormValues = z.infer<typeof servicoSchema>;

function rowToValues(s: ServicoRow): ServicoFormValues {
  return {
    codigo: s.codigo,
    descricao: s.descricao,
    descricao_completa: s.descricao_completa ?? "",
    categoria: s.categoria ?? "",
    unidade_padrao: s.unidade_padrao ?? "",
    preco_unitario: s.preco_unitario ?? 0,
    codigo_lc116: s.codigo_lc116 ?? "",
    codigo_municipio: s.codigo_municipio ?? "",
    aliquota_iss: s.aliquota_iss ?? 0,
    retem_iss: s.retem_iss,
    observacoes: s.observacoes ?? "",
    ativo: s.ativo,
  };
}

export function ServicoForm({
  mode,
  initialData,
  codigoSugerido,
}: {
  mode: "create" | "edit";
  initialData?: ServicoRow;
  codigoSugerido?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ServicoFormValues>({
    resolver: zodResolver(servicoSchema),
    defaultValues: initialData
      ? rowToValues(initialData)
      : {
          codigo: codigoSugerido ?? "",
          descricao: "",
          descricao_completa: "",
          categoria: "",
          unidade_padrao: "",
          preco_unitario: 0,
          codigo_lc116: "",
          codigo_municipio: "",
          aliquota_iss: 0,
          retem_iss: false,
          observacoes: "",
          ativo: true,
        },
  });

  const onSubmit: SubmitHandler<ServicoFormValues> = async (values) => {
    const input: ServicoInput = {
      codigo: values.codigo || null,
      descricao: values.descricao,
      descricao_completa: values.descricao_completa || null,
      categoria: values.categoria || null,
      unidade_padrao: values.unidade_padrao || null,
      preco_unitario: values.preco_unitario,
      codigo_lc116: values.codigo_lc116 || null,
      codigo_municipio: values.codigo_municipio || null,
      aliquota_iss: values.aliquota_iss,
      retem_iss: values.retem_iss,
      observacoes: values.observacoes || null,
      ativo: values.ativo,
    };

    const res =
      isEdit && initialData
        ? await updateServico(initialData.id, input)
        : await createServico(input);

    if (!res.ok) {
      toast.error("Erro ao salvar", { description: res.error });
      return;
    }
    toast.success(isEdit ? "Serviço atualizado" : "Serviço cadastrado");
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
            {isEdit ? "Editar serviço" : "Novo serviço"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Atualize a descrição, unidade, preço padrão e dados fiscais."
              : "Cadastre um serviço prestado. Defina a unidade (m²/unid) e o preço padrão de referência."}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
            <CardDescription>Código, descrição e categoria</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Código" error={errors.codigo?.message}>
              <Input {...register("codigo")} placeholder="SRV00001" />
            </Field>
            <Field label="Categoria" error={errors.categoria?.message}>
              <Input
                {...register("categoria")}
                placeholder="Ex.: Sinalização horizontal"
              />
            </Field>
            <Field
              label="Descrição *"
              error={errors.descricao?.message}
              className="sm:col-span-2"
            >
              <Input
                {...register("descricao")}
                placeholder="Ex.: Serviço de sinalização viária horizontal"
              />
            </Field>
            <Field
              label="Descrição completa"
              error={errors.descricao_completa?.message}
              className="sm:col-span-2"
            >
              <Textarea
                rows={2}
                {...register("descricao_completa")}
                placeholder="Descrição detalhada (usada na proposta/NFS-e)"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preço padrão</CardTitle>
            <CardDescription>
              Unidade e valor de referência para montar orçamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Unidade padrão" error={errors.unidade_padrao?.message}>
              <NativeSelect {...register("unidade_padrao")}>
                <option value="">A definir</option>
                {UNIDADES_SERVICO.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Preço unitário (R$)" error={errors.preco_unitario?.message}>
              <Input
                type="number"
                step="0.01"
                {...register("preco_unitario", { valueAsNumber: true })}
                placeholder="0,00"
                className="text-right tabular-nums"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados fiscais</CardTitle>
            <CardDescription>LC 116 e ISS (para emissão de NFS-e)</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Código LC 116" error={errors.codigo_lc116?.message}>
              <Input {...register("codigo_lc116")} placeholder="Ex.: 7.02" />
            </Field>
            <Field
              label="Código no município"
              error={errors.codigo_municipio?.message}
            >
              <Input {...register("codigo_municipio")} placeholder="Ex.: 70202" />
            </Field>
            <Field label="Alíquota ISS (%)" error={errors.aliquota_iss?.message}>
              <Input
                type="number"
                step="0.01"
                {...register("aliquota_iss", { valueAsNumber: true })}
                placeholder="0,00"
                className="text-right tabular-nums"
              />
            </Field>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input"
                  {...register("retem_iss")}
                />
                Retém ISS na fonte
              </label>
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
              placeholder="Notas internas sobre o serviço"
            />
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                {...register("ativo")}
              />
              Serviço ativo
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
                : "Cadastrar serviço"}
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
