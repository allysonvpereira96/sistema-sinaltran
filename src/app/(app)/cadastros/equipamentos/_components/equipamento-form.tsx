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
  createEquipamento,
  updateEquipamento,
  type EquipamentoInput,
} from "@/lib/actions/equipamentos";
import {
  EQUIPAMENTO_TIPO_LABEL,
  EQUIPAMENTO_STATUS_LABEL,
  type EquipamentoRow,
  type EquipamentoStatus,
  type EquipamentoTipo,
} from "@/lib/types/equipamento";
import { cn } from "@/lib/utils";

const BASE_PATH = "/cadastros/equipamentos";

const tipoValues = Object.keys(EQUIPAMENTO_TIPO_LABEL) as EquipamentoTipo[];
const statusValues = Object.keys(EQUIPAMENTO_STATUS_LABEL) as EquipamentoStatus[];

const equipamentoSchema = z.object({
  codigo: z.string().optional().or(z.literal("")),
  descricao: z.string().min(2, "Informe a descrição"),
  tipo: z.enum(tipoValues as [EquipamentoTipo, ...EquipamentoTipo[]]),
  placa: z.string().optional().or(z.literal("")),
  marca: z.string().optional().or(z.literal("")),
  modelo: z.string().optional().or(z.literal("")),
  ano: z.number().nullable().optional(),
  status: z.enum(statusValues as [EquipamentoStatus, ...EquipamentoStatus[]]),
  observacoes: z.string().optional().or(z.literal("")),
});

type EquipamentoFormValues = z.infer<typeof equipamentoSchema>;

function rowToValues(e: EquipamentoRow): EquipamentoFormValues {
  return {
    codigo: e.codigo ?? "",
    descricao: e.descricao,
    tipo: e.tipo,
    placa: e.placa ?? "",
    marca: e.marca ?? "",
    modelo: e.modelo ?? "",
    ano: e.ano,
    status: e.status,
    observacoes: e.observacoes ?? "",
  };
}

export function EquipamentoForm({
  mode,
  initialData,
}: {
  mode: "create" | "edit";
  initialData?: EquipamentoRow;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EquipamentoFormValues>({
    resolver: zodResolver(equipamentoSchema),
    defaultValues: initialData
      ? rowToValues(initialData)
      : {
          codigo: "",
          descricao: "",
          tipo: "veiculo",
          placa: "",
          marca: "",
          modelo: "",
          ano: null,
          status: "disponivel",
          observacoes: "",
        },
  });

  const onSubmit: SubmitHandler<EquipamentoFormValues> = async (values) => {
    const input: EquipamentoInput = {
      codigo: values.codigo || null,
      descricao: values.descricao,
      tipo: values.tipo,
      placa: values.placa || null,
      marca: values.marca || null,
      modelo: values.modelo || null,
      ano: values.ano ?? null,
      status: values.status,
      observacoes: values.observacoes || null,
    };

    const res =
      isEdit && initialData
        ? await updateEquipamento(initialData.id, input)
        : await createEquipamento(input);

    if (!res.ok) {
      toast.error("Erro ao salvar", { description: res.error });
      return;
    }
    toast.success(isEdit ? "Equipamento atualizado" : "Equipamento cadastrado");
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
            {isEdit ? "Editar equipamento" : "Novo equipamento"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Atualize os dados do equipamento / veículo."
              : "Cadastre um veículo, máquina ou ferramenta da frota."}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
            <CardDescription>Tipo, descrição e código</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Código" error={errors.codigo?.message}>
              <Input
                {...register("codigo")}
                placeholder="Gerado automaticamente se vazio"
              />
            </Field>
            <Field label="Tipo" error={errors.tipo?.message}>
              <NativeSelect {...register("tipo")}>
                {tipoValues.map((t) => (
                  <option key={t} value={t}>
                    {EQUIPAMENTO_TIPO_LABEL[t]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label="Descrição *"
              error={errors.descricao?.message}
              className="sm:col-span-2"
            >
              <Input
                {...register("descricao")}
                placeholder="Ex.: Caminhonete de apoio"
              />
            </Field>
            <Field label="Status" error={errors.status?.message}>
              <NativeSelect {...register("status")}>
                {statusValues.map((s) => (
                  <option key={s} value={s}>
                    {EQUIPAMENTO_STATUS_LABEL[s]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Placa" error={errors.placa?.message}>
              <Input {...register("placa")} placeholder="ABC1D23" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Marca" error={errors.marca?.message}>
              <Input {...register("marca")} placeholder="Ex.: Ford" />
            </Field>
            <Field label="Modelo" error={errors.modelo?.message}>
              <Input {...register("modelo")} placeholder="Ex.: Ranger XL" />
            </Field>
            <Field label="Ano" error={errors.ano?.message}>
              <Input
                type="number"
                {...register("ano", {
                  setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                })}
                placeholder="2021"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={3}
              {...register("observacoes")}
              placeholder="Notas internas, manutenções, etc."
            />
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
                : "Cadastrar equipamento"}
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
