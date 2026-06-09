"use client";

import { useEffect } from "react";
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
import { CLIENTES, UNIDADES } from "@/lib/mocks/cadastros";
import type { Obra, ObraStatus } from "@/lib/mocks/obras";
import { cn } from "@/lib/utils";

const obraStatusValues = [
  "planejamento",
  "em_andamento",
  "pausada",
  "concluida",
  "cancelada",
] as const;

const obraSchema = z.object({
  numero: z.string().min(1, "Número é obrigatório"),
  nome: z.string().min(3, "Informe o nome da obra"),
  cliente_id: z.string().min(1, "Cliente é obrigatório"),
  unidade_id: z.string().min(1, "Unidade é obrigatória"),
  responsavel: z.string().min(1, "Responsável é obrigatório"),
  endereco: z.string().optional().or(z.literal("")),
  cidade: z.string().optional().or(z.literal("")),
  estado: z.string().optional().or(z.literal("")),
  status: z.enum(obraStatusValues),
  data_inicio: z.string().optional().or(z.literal("")),
  data_fim_prevista: z.string().optional().or(z.literal("")),
  data_fim_real: z.string().optional().or(z.literal("")),
  valor_total: z.number({ message: "Informe o valor total" }).min(0, "Valor deve ser positivo"),
  mao_obra_direta: z.number().min(0, "Valor deve ser positivo"),
  mao_obra_indireta: z.number().min(0, "Valor deve ser positivo"),
  observacoes: z.string().optional().or(z.literal("")),
});

export type ObraFormValues = z.infer<typeof obraSchema>;

type ObraFormProps = {
  mode: "create" | "edit";
  initialData?: Obra;
};

const STATUS_LABEL: Record<ObraStatus, string> = {
  planejamento: "Planejamento",
  em_andamento: "Em andamento",
  pausada: "Pausada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

function nextObraNumero() {
  const ano = new Date().getFullYear();
  return `OB-${ano}-???`;
}

function obraToValues(obra: Obra): ObraFormValues {
  return {
    numero: obra.numero,
    nome: obra.nome,
    cliente_id: obra.cliente_id,
    unidade_id: obra.unidade_id,
    responsavel: obra.responsavel,
    endereco: obra.endereco ?? "",
    cidade: obra.cidade ?? "",
    estado: obra.estado ?? "",
    status: obra.status,
    data_inicio: obra.data_inicio ?? "",
    data_fim_prevista: obra.data_fim_prevista ?? "",
    data_fim_real: obra.data_fim_real ?? "",
    valor_total: obra.valor_total,
    mao_obra_direta: obra.mao_obra_direta,
    mao_obra_indireta: obra.mao_obra_indireta,
    observacoes: obra.observacoes ?? "",
  };
}

export function ObraForm({ mode, initialData }: ObraFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ObraFormValues>({
    resolver: zodResolver(obraSchema),
    defaultValues: initialData
      ? obraToValues(initialData)
      : {
          numero: nextObraNumero(),
          nome: "",
          cliente_id: "",
          unidade_id: "",
          responsavel: "",
          endereco: "",
          cidade: "",
          estado: "RS",
          status: "planejamento",
          data_inicio: "",
          data_fim_prevista: "",
          data_fim_real: "",
          valor_total: 0,
          mao_obra_direta: 0,
          mao_obra_indireta: 0,
          observacoes: "",
        },
  });

  useEffect(() => {
    if (initialData) reset(obraToValues(initialData));
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<ObraFormValues> = async () => {
    await new Promise((r) => setTimeout(r, 400));
    toast.success(isEdit ? "Obra atualizada" : "Obra criada", {
      description:
        "Os dados serão persistidos no Supabase assim que a conexão estiver configurada.",
    });
    router.push("/obras");
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1100px] mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <Link
          href="/obras"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          aria-label="Voltar para lista"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {isEdit ? "Editar obra" : "Nova obra"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Atualize os dados da obra cadastrada."
              : "Cadastre uma nova obra. Após salvar, será possível registrar medições, compras e equipe."}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados gerais</CardTitle>
            <CardDescription>Identificação, cliente e responsável</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Número da obra" error={errors.numero?.message}>
              <Input {...register("numero")} placeholder="OB-2026-001" />
            </Field>
            <Field label="Nome da obra *" error={errors.nome?.message}>
              <Input {...register("nome")} placeholder="Ex.: Sinalização Av. Brasil" />
            </Field>
            <Field label="Cliente *" error={errors.cliente_id?.message}>
              <NativeSelect {...register("cliente_id")}>
                <option value="">Selecione…</option>
                {CLIENTES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_fantasia ?? c.razao_social}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Unidade *" error={errors.unidade_id?.message}>
              <NativeSelect {...register("unidade_id")}>
                <option value="">Selecione…</option>
                {UNIDADES.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Responsável *" error={errors.responsavel?.message}>
              <Input {...register("responsavel")} placeholder="Nome do responsável" />
            </Field>
            <Field label="Status">
              <NativeSelect {...register("status")}>
                {obraStatusValues.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Local da obra</CardTitle>
            <CardDescription>Endereço de execução</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Endereço"
              error={errors.endereco?.message}
              className="sm:col-span-2"
            >
              <Input
                {...register("endereco")}
                placeholder="Rua, avenida, rodovia + trecho"
              />
            </Field>
            <Field label="Cidade" error={errors.cidade?.message}>
              <Input {...register("cidade")} placeholder="Caxias do Sul" />
            </Field>
            <Field label="Estado" error={errors.estado?.message}>
              <Input {...register("estado")} placeholder="RS" maxLength={2} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cronograma</CardTitle>
            <CardDescription>Datas de execução</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Data de início" error={errors.data_inicio?.message}>
              <Input type="date" {...register("data_inicio")} />
            </Field>
            <Field
              label="Previsão de término"
              error={errors.data_fim_prevista?.message}
            >
              <Input type="date" {...register("data_fim_prevista")} />
            </Field>
            <Field
              label="Término real"
              error={errors.data_fim_real?.message}
            >
              <Input type="date" {...register("data_fim_real")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financeiro</CardTitle>
            <CardDescription>
              Valor contratado e composição de mão de obra
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Valor total contratado"
              error={errors.valor_total?.message}
            >
              <Input
                type="number"
                step="0.01"
                {...register("valor_total", { valueAsNumber: true })}
                placeholder="0,00"
              />
            </Field>
            <Field
              label="Mão de obra direta"
              error={errors.mao_obra_direta?.message}
            >
              <Input
                type="number"
                step="0.01"
                {...register("mao_obra_direta", { valueAsNumber: true })}
                placeholder="0,00"
              />
            </Field>
            <Field
              label="Mão de obra indireta"
              error={errors.mao_obra_indireta?.message}
            >
              <Input
                type="number"
                step="0.01"
                {...register("mao_obra_indireta", { valueAsNumber: true })}
                placeholder="0,00"
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
              rows={4}
              {...register("observacoes")}
              placeholder="Informações relevantes sobre a obra"
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/obras"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Cancelar
          </Link>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save className="size-4" />
            {isSubmitting ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar obra"}
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
      {error ? (
        <p className="text-xs text-rose-600 font-medium">{error}</p>
      ) : null}
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
