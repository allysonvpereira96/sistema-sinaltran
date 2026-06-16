"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createMedicao,
  updateMedicao,
  proximoNumeroMedicao,
  type MedicaoInput,
} from "@/lib/actions/medicoes";
import {
  MEDICAO_STATUS_LABEL,
  type MedicaoDetalhe,
  type MedicaoStatus,
} from "@/lib/types/medicao";
import { calcularSaldo, type ObraListRow } from "@/lib/types/obra";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

const medicaoStatusValues = [
  "rascunho",
  "enviada",
  "aprovada",
  "rejeitada",
] as const;

const medicaoSchema = z
  .object({
    obra_id: z.string().min(1, "Obra é obrigatória"),
    numero: z.number({ message: "Número é obrigatório" }).int().min(1, "Mínimo 1"),
    data_inicio: z.string().min(1, "Data de início é obrigatória"),
    data_fim: z.string().min(1, "Data de fim é obrigatória"),
    valor_total: z.number().min(0, "Valor deve ser positivo"),
    percentual_executado: z.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
    status: z.enum(medicaoStatusValues),
    data_envio: z.string().optional().or(z.literal("")),
    data_aprovacao: z.string().optional().or(z.literal("")),
    data_previsao_recebimento: z.string().optional().or(z.literal("")),
    observacoes: z.string().optional().or(z.literal("")),
  })
  .refine((v) => v.data_fim >= v.data_inicio, {
    path: ["data_fim"],
    message: "Data fim deve ser posterior ao início",
  });

export type MedicaoFormValues = z.infer<typeof medicaoSchema>;

function medicaoToValues(m: MedicaoDetalhe): MedicaoFormValues {
  return {
    obra_id: m.obra_id,
    numero: m.numero,
    data_inicio: m.data_inicio,
    data_fim: m.data_fim,
    valor_total: m.valor_total,
    percentual_executado: m.percentual_executado,
    status: m.status,
    data_envio: m.data_envio ?? "",
    data_aprovacao: m.data_aprovacao ?? "",
    data_previsao_recebimento: m.data_previsao_recebimento ?? "",
    observacoes: m.observacoes ?? "",
  };
}

export function MedicaoForm({
  mode,
  initialData,
  obras,
}: {
  mode: "create" | "edit";
  initialData?: MedicaoDetalhe;
  obras: ObraListRow[];
}) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MedicaoFormValues>({
    resolver: zodResolver(medicaoSchema),
    defaultValues: initialData
      ? medicaoToValues(initialData)
      : {
          obra_id: "",
          numero: 1,
          data_inicio: "",
          data_fim: "",
          valor_total: 0,
          percentual_executado: 0,
          status: "rascunho",
          data_envio: "",
          data_aprovacao: "",
          data_previsao_recebimento: "",
          observacoes: "",
        },
  });

  useEffect(() => {
    if (initialData) reset(medicaoToValues(initialData));
  }, [initialData, reset]);

  const watchedObraId = useWatch({ control, name: "obra_id" });
  const watchedValor = useWatch({ control, name: "valor_total" }) ?? 0;
  const watchedPercentual = useWatch({ control, name: "percentual_executado" }) ?? 0;

  const obraSelecionada = useMemo(
    () => obras.find((o) => o.id === watchedObraId),
    [obras, watchedObraId],
  );
  const saldoObra = useMemo(
    () =>
      obraSelecionada
        ? calcularSaldo(obraSelecionada.valor_total, obraSelecionada.valor_medido)
        : null,
    [obraSelecionada],
  );

  // Auto-preenche o número ao escolher a obra (apenas em create).
  useEffect(() => {
    if (isEdit || !watchedObraId) return;
    let cancelado = false;
    proximoNumeroMedicao(watchedObraId).then((n) => {
      if (!cancelado) setValue("numero", n);
    });
    return () => {
      cancelado = true;
    };
  }, [watchedObraId, isEdit, setValue]);

  const onSubmit: SubmitHandler<MedicaoFormValues> = async (values) => {
    const input: MedicaoInput = {
      obra_id: values.obra_id,
      numero: values.numero,
      data_inicio: values.data_inicio,
      data_fim: values.data_fim,
      valor_total: values.valor_total,
      percentual_executado: values.percentual_executado,
      status: values.status,
      data_envio: values.data_envio || null,
      data_aprovacao: values.data_aprovacao || null,
      data_previsao_recebimento: values.data_previsao_recebimento || null,
      observacoes: values.observacoes || null,
    };

    const res =
      isEdit && initialData
        ? await updateMedicao(initialData.id, input)
        : await createMedicao(input);

    if (!res.ok) {
      toast.error("Erro ao salvar", { description: res.error });
      return;
    }
    toast.success(isEdit ? "Medição atualizada" : "Medição criada");
    const destino =
      isEdit && initialData
        ? `/financeiro/receber/${initialData.id}`
        : "id" in res
          ? `/financeiro/receber/${res.id}`
          : "/financeiro/receber";
    router.push(destino);
    router.refresh();
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1100px] mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <Link
          href="/financeiro/receber"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          aria-label="Voltar para lista"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {isEdit ? "Editar medição" : "Nova medição"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Atualize o boletim de medição."
              : "Registre um boletim de medição vinculado a uma obra. Ao ser aprovada, vira uma conta a receber."}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Vinculação</CardTitle>
            <CardDescription>Obra e identificação da medição</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Obra *" error={errors.obra_id?.message}>
              <NativeSelect {...register("obra_id")} disabled={isEdit}>
                <option value="">Selecione…</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.numero} — {o.nome}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Número da medição *" error={errors.numero?.message}>
              <Input type="number" step={1} {...register("numero", { valueAsNumber: true })} />
            </Field>
          </CardContent>
          {obraSelecionada && saldoObra ? (
            <CardContent className="border-t pt-4">
              <div className="grid gap-4 sm:grid-cols-3 text-xs">
                <SaldoRow
                  label="Valor contratado"
                  value={formatBRL(obraSelecionada.valor_total)}
                />
                <SaldoRow
                  label="Já medido"
                  value={`${formatBRL(obraSelecionada.valor_medido)} (${saldoObra.percentual_executado.toFixed(1)}%)`}
                />
                <SaldoRow
                  label="Saldo a medir"
                  value={`${formatBRL(saldoObra.saldo_restante)} (${saldoObra.percentual_restante.toFixed(1)}%)`}
                  highlight
                />
              </div>
            </CardContent>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Período medido</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Data de início *" error={errors.data_inicio?.message}>
              <Input type="date" {...register("data_inicio")} />
            </Field>
            <Field label="Data de fim *" error={errors.data_fim?.message}>
              <Input type="date" {...register("data_fim")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valores</CardTitle>
            <CardDescription>
              Valor medido no período e percentual executado da obra
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Valor da medição *" error={errors.valor_total?.message}>
              <Input
                type="number"
                step="0.01"
                {...register("valor_total", { valueAsNumber: true })}
              />
            </Field>
            <Field label="% Executado *" error={errors.percentual_executado?.message}>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={100}
                {...register("percentual_executado", { valueAsNumber: true })}
              />
            </Field>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                Resumo
              </Label>
              <div className="h-9 px-3 rounded-md border bg-muted/40 text-sm flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold tabular-nums">
                  {formatBRL(watchedValor)} ({watchedPercentual.toFixed(0)}%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fluxo de aprovação</CardTitle>
            <CardDescription>
              Datas de envio ao cliente, aprovação e previsão de recebimento
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Status">
              <NativeSelect {...register("status")}>
                {medicaoStatusValues.map((s) => (
                  <option key={s} value={s}>
                    {MEDICAO_STATUS_LABEL[s as MedicaoStatus]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Data de envio" error={errors.data_envio?.message}>
              <Input type="date" {...register("data_envio")} />
            </Field>
            <Field label="Data de aprovação" error={errors.data_aprovacao?.message}>
              <Input type="date" {...register("data_aprovacao")} />
            </Field>
            <Field
              label="Prev. recebimento"
              error={errors.data_previsao_recebimento?.message}
            >
              <Input type="date" {...register("data_previsao_recebimento")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={4}
              {...register("observacoes")}
              placeholder="Etapas concluídas, vistorias, condições especiais"
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/financeiro/receber"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Cancelar
          </Link>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save className="size-4" />
            {isSubmitting ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar medição"}
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

function SaldoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-card p-3",
        highlight && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </div>
      <div className="text-sm font-semibold mt-1 tabular-nums">{value}</div>
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
      "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60",
      className,
    )}
  >
    {children}
  </select>
);
