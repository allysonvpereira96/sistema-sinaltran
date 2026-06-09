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
import { CLIENTES, EMPRESAS, MATERIAIS } from "@/lib/mocks/cadastros";
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
  secao: z.string().min(1, "Seção é obrigatória"),
  material_id: z.string().nullable().optional(),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  unidade_medida: z.string().min(1, "Un."),
  quantidade: z.number().min(0.001, "Informe a quantidade"),
  valor_unit_mao_obra: z.number().min(0, "Inválido"),
  valor_unit_material: z.number().min(0, "Inválido"),
});

const orcamentoSchema = z.object({
  numero: z.string().min(1, "Número é obrigatório"),
  empresa_id: z.string().min(1, "Empresa emissora é obrigatória"),
  cliente_id: z.string().min(1, "Cliente é obrigatório"),
  responsavel: z.string().min(1, "Responsável é obrigatório"),
  descricao: z.string().min(3, "Informe a descrição da proposta"),
  endereco: z.string().optional().or(z.literal("")),
  cidade: z.string().optional().or(z.literal("")),
  estado: z.string().optional().or(z.literal("")),
  engenheiro_responsavel: z.string().optional().or(z.literal("")),
  crea_engenheiro: z.string().optional().or(z.literal("")),
  prazo_execucao: z.string().optional().or(z.literal("")),
  condicoes_pagamento: z.string().optional().or(z.literal("")),
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
  return `ORC-${ano}-????`;
}

function orcamentoToValues(o: Orcamento): OrcamentoFormValues {
  return {
    numero: o.numero,
    empresa_id: o.empresa_id,
    cliente_id: o.cliente_id,
    responsavel: o.responsavel,
    descricao: o.descricao ?? "",
    endereco: o.endereco ?? "",
    cidade: o.cidade ?? "",
    estado: o.estado ?? "",
    engenheiro_responsavel: o.engenheiro_responsavel ?? "",
    crea_engenheiro: o.crea_engenheiro ?? "",
    prazo_execucao: o.prazo_execucao ?? "",
    condicoes_pagamento: o.condicoes_pagamento ?? "",
    status: o.status,
    data_envio: o.data_envio ?? "",
    data_validade: o.data_validade ?? "",
    observacoes: o.observacoes ?? "",
    itens: o.itens.map((i) => ({
      secao: i.secao,
      material_id: i.material_id,
      descricao: i.descricao,
      unidade_medida: i.unidade_medida,
      quantidade: i.quantidade,
      valor_unit_mao_obra: i.valor_unit_mao_obra,
      valor_unit_material: i.valor_unit_material,
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
          empresa_id: EMPRESAS[0].id,
          cliente_id: "",
          responsavel: EMPRESAS[0].responsavel_padrao ?? "",
          descricao: "",
          endereco: "",
          cidade: "",
          estado: "RS",
          engenheiro_responsavel: "",
          crea_engenheiro: "",
          prazo_execucao: "",
          condicoes_pagamento: "Boleto 30 dias",
          status: "rascunho",
          data_envio: "",
          data_validade: "",
          observacoes: "",
          itens: [
            {
              secao: "SINALIZAÇÃO HORIZONTAL",
              material_id: null,
              descricao: "",
              unidade_medida: "UN",
              quantidade: 1,
              valor_unit_mao_obra: 0,
              valor_unit_material: 0,
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

  const watchedItens = useWatch({ control, name: "itens" });

  const subtotais = useMemo(
    () =>
      (watchedItens ?? []).map((i) => {
        const q = Number(i?.quantidade) || 0;
        const mo = Number(i?.valor_unit_mao_obra) || 0;
        const mat = Number(i?.valor_unit_material) || 0;
        return {
          mao_obra: q * mo,
          material: q * mat,
          total: q * (mo + mat),
        };
      }),
    [watchedItens],
  );

  const totaisGerais = useMemo(() => {
    return subtotais.reduce(
      (acc, s) => ({
        mao_obra: acc.mao_obra + s.mao_obra,
        material: acc.material + s.material,
        total: acc.total + s.total,
      }),
      { mao_obra: 0, material: 0, total: 0 },
    );
  }, [subtotais]);

  // Seções únicas para sugerir no datalist
  const secoesSugeridas = useMemo(() => {
    const set = new Set<string>([
      "SINALIZAÇÃO HORIZONTAL",
      "SINALIZAÇÃO VERTICAL",
      "TACHAS REFLETIVAS",
      "SUPORTES",
      "SEMÁFOROS",
      "TINTA",
      "INSUMOS",
    ]);
    (watchedItens ?? []).forEach((i) => {
      if (i?.secao) set.add(i.secao);
    });
    return [...set];
  }, [watchedItens]);

  const onSubmit: SubmitHandler<OrcamentoFormValues> = async () => {
    await new Promise((r) => setTimeout(r, 400));
    toast.success(isEdit ? "Orçamento atualizado" : "Orçamento criado", {
      description:
        "Em breve este orçamento será persistido no Supabase em vez de mocks.",
    });
    router.push("/comercial/orcamentos");
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1300px] mx-auto space-y-6">
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
              : "Monte uma proposta com itens divididos por seção, MO e material separados. Após aprovação, vira obra com 1 clique."}
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
            <Field label="Empresa emissora *" error={errors.empresa_id?.message}>
              <NativeSelect {...register("empresa_id")}>
                {EMPRESAS.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome} — {e.razao_social}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Número" error={errors.numero?.message}>
              <Input {...register("numero")} placeholder="ORC-2026-0001" />
            </Field>
            <Field
              label="Descrição *"
              error={errors.descricao?.message}
              className="sm:col-span-2"
            >
              <Input
                {...register("descricao")}
                placeholder="Ex.: Sinalização viária — obra Ararica"
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
            <Field label="Responsável pela proposta *" error={errors.responsavel?.message}>
              <Input
                {...register("responsavel")}
                placeholder="Nome do responsável"
              />
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
            <Field label="Data de envio" error={errors.data_envio?.message}>
              <Input type="date" {...register("data_envio")} />
            </Field>
            <Field label="Validade da proposta" error={errors.data_validade?.message}>
              <Input type="date" {...register("data_validade")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Local da obra</CardTitle>
            <CardDescription>
              Endereço de execução (será copiado para a obra ao converter)
            </CardDescription>
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
            <Field label="Estado" error={errors.estado?.message}>
              <Input {...register("estado")} placeholder="RS" maxLength={2} />
            </Field>
            <Field
              label="Cidade"
              error={errors.cidade?.message}
              className="sm:col-span-3"
            >
              <Input {...register("cidade")} placeholder="Ararica" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Condições de fornecimento</CardTitle>
            <CardDescription>
              Engenheiro responsável (cliente), prazo e pagamento
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Engenheiro responsável (cliente)"
              error={errors.engenheiro_responsavel?.message}
            >
              <Input
                {...register("engenheiro_responsavel")}
                placeholder="Nome do engenheiro"
              />
            </Field>
            <Field label="CREA" error={errors.crea_engenheiro?.message}>
              <Input
                {...register("crea_engenheiro")}
                placeholder="ex.: 244084 CREA/RS"
              />
            </Field>
            <Field label="Prazo de execução" error={errors.prazo_execucao?.message}>
              <Input
                {...register("prazo_execucao")}
                placeholder="ex.: 5 dias"
              />
            </Field>
            <Field
              label="Condições de pagamento"
              error={errors.condicoes_pagamento?.message}
            >
              <Input
                {...register("condicoes_pagamento")}
                placeholder="ex.: Boleto 30 dias"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Itens da proposta</CardTitle>
              <CardDescription>
                Cada item separa Mão de Obra (R$) e Material (R$). Pode ser
                zero em um dos campos (ex.: placa = só material).
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => {
                const lastSecao =
                  watchedItens?.[watchedItens.length - 1]?.secao ??
                  "SINALIZAÇÃO HORIZONTAL";
                append({
                  secao: lastSecao,
                  material_id: null,
                  descricao: "",
                  unidade_medida: "UN",
                  quantidade: 1,
                  valor_unit_mao_obra: 0,
                  valor_unit_material: 0,
                });
              }}
            >
              <Plus className="size-4" /> Adicionar item
            </Button>
          </CardHeader>
          <CardContent>
            <datalist id="secoes-sugeridas">
              {secoesSugeridas.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                    <th className="text-left font-semibold py-2 pr-2 w-12">#</th>
                    <th className="text-left font-semibold py-2 px-2 min-w-[260px]">
                      Descrição
                    </th>
                    <th className="text-left font-semibold py-2 px-2 w-20">Un.</th>
                    <th className="text-right font-semibold py-2 px-2 w-24">Qtd.</th>
                    <th className="text-right font-semibold py-2 px-2 w-32">
                      MO unit.
                    </th>
                    <th className="text-right font-semibold py-2 px-2 w-32">
                      Mat. unit.
                    </th>
                    <th className="text-right font-semibold py-2 px-2 w-32">
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
                      <td className="py-2 px-2 align-top space-y-1.5">
                        <input
                          {...register(`itens.${index}.secao` as const)}
                          list="secoes-sugeridas"
                          placeholder="Seção (ex.: SINALIZAÇÃO HORIZONTAL)"
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] uppercase tracking-wider font-semibold text-foreground/80"
                        />
                        <select
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                          {...register(`itens.${index}.material_id` as const)}
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
                          placeholder="Descrição completa do item"
                          className="h-9"
                        />
                        {errors.itens?.[index]?.descricao ? (
                          <p className="text-[10px] text-rose-600">
                            {errors.itens[index]?.descricao?.message}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2 px-2 align-top">
                        <Input
                          {...register(`itens.${index}.unidade_medida` as const)}
                          className="h-9 text-xs"
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
                          {...register(
                            `itens.${index}.valor_unit_mao_obra` as const,
                            { valueAsNumber: true },
                          )}
                          className="h-9 text-right tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-2 align-top">
                        <Input
                          type="number"
                          step="0.01"
                          {...register(
                            `itens.${index}.valor_unit_material` as const,
                            { valueAsNumber: true },
                          )}
                          className="h-9 text-right tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-2 align-top">
                        <div className="h-9 grid place-items-end font-semibold tabular-nums text-sm">
                          {formatBRL(subtotais[index]?.total ?? 0)}
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
                    <td colSpan={4} />
                    <td className="py-2 px-2 text-right text-xs uppercase tracking-wider text-muted-foreground">
                      Total MO
                    </td>
                    <td className="py-2 px-2 text-right text-xs uppercase tracking-wider text-muted-foreground">
                      Total Mat.
                    </td>
                    <td className="py-2 px-2 text-right text-xs uppercase tracking-wider text-muted-foreground">
                      Total Geral
                    </td>
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={4} />
                    <td className="py-2 px-2 text-right font-semibold tabular-nums">
                      {formatBRL(totaisGerais.mao_obra)}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold tabular-nums">
                      {formatBRL(totaisGerais.material)}
                    </td>
                    <td className="py-2 px-2 text-right text-lg font-bold tabular-nums">
                      {formatBRL(totaisGerais.total)}
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
              placeholder="Notas internas, condições especiais"
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
