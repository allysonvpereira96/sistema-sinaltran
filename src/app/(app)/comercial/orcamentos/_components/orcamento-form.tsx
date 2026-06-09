"use client";

import { useEffect, useMemo } from "react";
import {
  useForm,
  useFieldArray,
  useWatch,
  type SubmitHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
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
import { CLIENTES, UNIDADES, MATERIAIS } from "@/lib/mocks/cadastros";
import type { Orcamento, OrcamentoStatus } from "@/lib/mocks/orcamentos";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

const orcamentoStatusValues = [
  "rascunho",
  "enviado",
  "aprovado",
  "rejeitado",
  "perdido",
] as const;

const itemSchema = z.object({
  material_id: z.string().nullable().optional(),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  unidade_medida: z.string().min(1, "Un."),
  quantidade: z.number().min(0.001, "Informe a quantidade"),
  valor_unitario: z.number().min(0, "Informe o valor"),
});

const orcamentoSchema = z.object({
  numero: z.string().min(1, "Número é obrigatório"),
  cliente_id: z.string().min(1, "Cliente é obrigatório"),
  unidade_id: z.string().min(1, "Unidade é obrigatória"),
  responsavel: z.string().min(1, "Responsável é obrigatório"),
  descricao: z.string().min(3, "Informe a descrição da proposta"),
  status: z.enum(orcamentoStatusValues),
  data_envio: z.string().optional().or(z.literal("")),
  data_validade: z.string().optional().or(z.literal("")),
  observacoes: z.string().optional().or(z.literal("")),
  itens: z.array(itemSchema).min(1, "Adicione pelo menos um item"),
});

export type OrcamentoFormValues = z.infer<typeof orcamentoSchema>;

const STATUS_LABEL: Record<OrcamentoStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  perdido: "Perdido",
};

function nextOrcamentoNumero() {
  const ano = new Date().getFullYear();
  return `PR-${ano}-????`;
}

function orcamentoToValues(o: Orcamento): OrcamentoFormValues {
  return {
    numero: o.numero,
    cliente_id: o.cliente_id,
    unidade_id: o.unidade_id,
    responsavel: o.responsavel,
    descricao: o.descricao ?? "",
    status: o.status,
    data_envio: o.data_envio ?? "",
    data_validade: o.data_validade ?? "",
    observacoes: o.observacoes ?? "",
    itens: o.itens.map((i) => ({
      material_id: i.material_id,
      descricao: i.descricao,
      unidade_medida: i.unidade_medida,
      quantidade: i.quantidade,
      valor_unitario: i.valor_unitario,
    })),
  };
}

export function OrcamentoForm({
  mode,
  initialData,
}: {
  mode: "create" | "edit";
  initialData?: Orcamento;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrcamentoFormValues>({
    resolver: zodResolver(orcamentoSchema),
    defaultValues: initialData
      ? orcamentoToValues(initialData)
      : {
          numero: nextOrcamentoNumero(),
          cliente_id: "",
          unidade_id: "",
          responsavel: "",
          descricao: "",
          status: "rascunho",
          data_envio: "",
          data_validade: "",
          observacoes: "",
          itens: [
            {
              material_id: null,
              descricao: "",
              unidade_medida: "UN",
              quantidade: 1,
              valor_unitario: 0,
            },
          ],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "itens",
  });

  useEffect(() => {
    if (initialData) reset(orcamentoToValues(initialData));
  }, [initialData, reset]);

  // Watch dos itens para calcular subtotal/total em tempo real
  const watchedItens = useWatch({ control, name: "itens" });

  const subtotais = useMemo(
    () =>
      (watchedItens ?? []).map((i) => {
        const q = Number(i?.quantidade) || 0;
        const v = Number(i?.valor_unitario) || 0;
        return q * v;
      }),
    [watchedItens],
  );

  const valorTotal = useMemo(
    () => subtotais.reduce((acc, v) => acc + v, 0),
    [subtotais],
  );

  const onSubmit: SubmitHandler<OrcamentoFormValues> = async () => {
    await new Promise((r) => setTimeout(r, 400));
    toast.success(isEdit ? "Orçamento atualizado" : "Orçamento criado", {
      description:
        "Os dados serão persistidos no Supabase assim que a conexão estiver configurada.",
    });
    router.push("/comercial/orcamentos");
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <Link
          href="/comercial/orcamentos"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          aria-label="Voltar para lista"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {isEdit ? "Editar orçamento" : "Novo orçamento"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Atualize os dados da proposta comercial."
              : "Monte uma proposta com itens e valores. Após aprovação, ela pode virar uma obra com 1 clique."}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
            <CardDescription>Dados gerais da proposta</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Número" error={errors.numero?.message}>
              <Input {...register("numero")} placeholder="PR-2026-0001" />
            </Field>
            <Field label="Status">
              <NativeSelect {...register("status")}>
                {orcamentoStatusValues.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
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
                placeholder="Ex.: Sinalização horizontal Av. Brasil — Lote 2"
              />
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
              <Input
                {...register("responsavel")}
                placeholder="Nome do responsável pela proposta"
              />
            </Field>
            <Field label="Data de envio" error={errors.data_envio?.message}>
              <Input type="date" {...register("data_envio")} />
            </Field>
            <Field label="Validade da proposta" error={errors.data_validade?.message}>
              <Input type="date" {...register("data_validade")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Itens da proposta</CardTitle>
              <CardDescription>
                Adicione os serviços e materiais com quantidade e valor unitário
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() =>
                append({
                  material_id: null,
                  descricao: "",
                  unidade_medida: "UN",
                  quantidade: 1,
                  valor_unitario: 0,
                })
              }
            >
              <Plus className="size-4" /> Adicionar item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                    <th className="text-left font-semibold py-2 pr-2 w-12">#</th>
                    <th className="text-left font-semibold py-2 px-2 min-w-[260px]">
                      Descrição
                    </th>
                    <th className="text-left font-semibold py-2 px-2 w-24">Un.</th>
                    <th className="text-right font-semibold py-2 px-2 w-32">Qtd.</th>
                    <th className="text-right font-semibold py-2 px-2 w-36">
                      Valor unit.
                    </th>
                    <th className="text-right font-semibold py-2 px-2 w-36">
                      Subtotal
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr key={field.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-2 text-xs font-mono text-muted-foreground align-top pt-4">
                        {index + 1}
                      </td>
                      <td className="py-2 px-2 align-top">
                        <select
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs mb-1.5"
                          {...register(`itens.${index}.material_id` as const)}
                          onChange={(e) => {
                            const m = MATERIAIS.find((mat) => mat.id === e.target.value);
                            if (m) {
                              const input = document.querySelector<HTMLInputElement>(
                                `input[name="itens.${index}.descricao"]`,
                              );
                              const valor = document.querySelector<HTMLInputElement>(
                                `input[name="itens.${index}.valor_unitario"]`,
                              );
                              const un = document.querySelector<HTMLInputElement>(
                                `input[name="itens.${index}.unidade_medida"]`,
                              );
                              if (input && !input.value) input.value = m.descricao;
                              if (valor && !valor.value) {
                                valor.value = String(m.valor_referencia);
                                valor.dispatchEvent(
                                  new Event("input", { bubbles: true }),
                                );
                              }
                              if (un) {
                                un.value = m.unidade_medida;
                                un.dispatchEvent(
                                  new Event("input", { bubbles: true }),
                                );
                              }
                            }
                          }}
                        >
                          <option value="">Material avulso (sem catálogo)</option>
                          {MATERIAIS.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.codigo} · {m.descricao.slice(0, 48)}
                            </option>
                          ))}
                        </select>
                        <Input
                          {...register(`itens.${index}.descricao` as const)}
                          placeholder="Descrição do item"
                          className="h-9"
                        />
                        {errors.itens?.[index]?.descricao ? (
                          <p className="text-[10px] text-rose-600 mt-1">
                            {errors.itens[index]?.descricao?.message}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2 px-2 align-top">
                        <Input
                          {...register(`itens.${index}.unidade_medida` as const)}
                          className="h-9 text-xs uppercase"
                          maxLength={6}
                        />
                      </td>
                      <td className="py-2 px-2 align-top">
                        <Input
                          type="number"
                          step="0.001"
                          {...register(`itens.${index}.quantidade` as const, {
                            valueAsNumber: true,
                          })}
                          className="h-9 text-right tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-2 align-top">
                        <Input
                          type="number"
                          step="0.01"
                          {...register(`itens.${index}.valor_unitario` as const, {
                            valueAsNumber: true,
                          })}
                          className="h-9 text-right tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-2 align-top">
                        <div className="h-9 grid place-items-end font-semibold tabular-nums text-sm">
                          {formatBRL(subtotais[index] ?? 0)}
                        </div>
                      </td>
                      <td className="py-2 align-top">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                          aria-label="Remover item"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-foreground/10">
                    <td colSpan={5} className="py-3 px-2 text-right text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Total do orçamento
                    </td>
                    <td className="py-3 px-2 text-right text-lg font-bold tabular-nums">
                      {formatBRL(valorTotal)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            {errors.itens && typeof errors.itens.message === "string" ? (
              <p className="text-xs text-rose-600 mt-3">{errors.itens.message}</p>
            ) : null}
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
              placeholder="Condições, prazos especiais ou notas internas"
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/comercial/orcamentos"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Cancelar
          </Link>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save className="size-4" />
            {isSubmitting
              ? "Salvando…"
              : isEdit
                ? "Salvar alterações"
                : "Criar orçamento"}
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
