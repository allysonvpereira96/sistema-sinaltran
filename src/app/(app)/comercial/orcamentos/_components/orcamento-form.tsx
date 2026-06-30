"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useForm,
  useFieldArray,
  useWatch,
  type SubmitHandler,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, ArrowLeft, Plus, Trash2, RotateCcw, X } from "lucide-react";
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
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ClientePicker } from "@/components/app/cliente-picker";
import {
  CatalogoPicker,
  type CriadoCatalogo,
} from "@/components/app/catalogo-picker";
import {
  createOrcamento,
  updateOrcamento,
  type EmpresaResumo,
  type MaterialResumo,
} from "@/lib/actions/orcamentos";
import type { ServicoResumo } from "@/lib/actions/servicos";
import { useFormDraft } from "@/lib/hooks/use-form-draft";
import {
  ORCAMENTO_STATUS_LABEL,
  type OrcamentoDetalhe,
  type OrcamentoInput,
  type OrcamentoStatus,
} from "@/lib/types/orcamento";

const orcamentoStatusValues = [
  "rascunho",
  "enviado",
  "aprovado",
  "rejeitado",
  "perdido",
] as const;

const itemSchema = z.object({
  secao: z.string().optional().or(z.literal("")),
  material_id: z.string().nullable().optional(),
  servico_id: z.string().nullable().optional(),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  unidade_medida: z.string().min(1, "Un."),
  quantidade: z.number().min(0.001, "Informe a quantidade"),
  valor_unit_mao_obra: z.number().min(0, "Inválido"),
  valor_unit_material: z.number().min(0, "Inválido"),
});

const orcamentoSchema = z.object({
  numero: z.string().optional().or(z.literal("")),
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
  emite_nota_unica_servico: z.boolean().optional(),
  itens: z.array(itemSchema).min(1, "Adicione pelo menos um item"),
});

export type OrcamentoFormValues = z.infer<typeof orcamentoSchema>;

/** Converte a unidade padrão do serviço para o rótulo curto usado no item. */
const UNIDADE_ITEM: Record<string, string> = {
  m2: "m²",
  metro: "m",
  unidade: "UN",
  diaria: "diária",
  hora: "h",
  global: "vb",
};

/** Unidades oferecidas no seletor de cada item do orçamento. */
const UNIDADES_ITEM_OPCOES = [
  "UN",
  "m²",
  "m",
  "m³",
  "kg",
  "L",
  "par",
  "cento",
  "diária",
  "h",
  "vb",
  "cx",
  "balde",
  "tambor",
];

function detalheToValues(o: OrcamentoDetalhe): OrcamentoFormValues {
  return {
    numero: o.numero,
    empresa_id: o.empresa_id ?? "",
    cliente_id: o.cliente_id ?? "",
    responsavel: o.responsavel ?? "",
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
    emite_nota_unica_servico: o.emite_nota_unica_servico ?? false,
    itens: o.itens.map((i) => ({
      secao: i.secao ?? "",
      material_id: i.material_id,
      servico_id: i.servico_id,
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
  empresas,
  materiais: materiaisProp,
  servicos: servicosProp,
  numeroSugerido,
}: {
  mode: "create" | "edit";
  initialData?: OrcamentoDetalhe;
  empresas: EmpresaResumo[];
  materiais: MaterialResumo[];
  servicos: ServicoResumo[];
  numeroSugerido?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";

  // Catálogo em estado: cresce quando um item é cadastrado na hora.
  const [servicos, setServicos] = useState(servicosProp);
  const [materiais, setMateriais] = useState(materiaisProp);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<OrcamentoFormValues>({
    resolver: zodResolver(orcamentoSchema),
    defaultValues: initialData
      ? detalheToValues(initialData)
      : {
          numero: numeroSugerido ?? "",
          empresa_id: empresas[0]?.id ?? "",
          cliente_id: "",
          responsavel: empresas[0]?.responsavel_padrao ?? "",
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
          emite_nota_unica_servico: false,
          itens: [
            {
              secao: "SINALIZAÇÃO HORIZONTAL",
              material_id: null,
              servico_id: null,
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
    if (initialData) reset(detalheToValues(initialData));
  }, [initialData, reset]);

  // Rede de segurança: rascunho automático no navegador + aviso ao sair.
  const storageKey = `orcamento:draft:${isEdit && initialData ? initialData.id : "novo"}`;
  const {
    draft: rascunho,
    clear: limparRascunho,
    dismiss: ignorarRascunho,
    discard: descartarRascunho,
  } = useFormDraft<OrcamentoFormValues>({
    storageKey,
    dirty: isDirty,
    subscribe: useCallback(
      (cb: (v: OrcamentoFormValues) => void) => {
        const sub = watch((v) => cb(v as OrcamentoFormValues));
        return () => sub.unsubscribe();
      },
      [watch],
    ),
  });

  function restaurarRascunho() {
    if (!rascunho) return;
    try {
      reset(rascunho);
      toast.success("Rascunho restaurado");
    } catch {
      toast.error("Não foi possível restaurar o rascunho");
    }
    ignorarRascunho();
  }

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

  // Preenche o item a partir de um serviço.
  function preencherServico(index: number, s: ServicoResumo) {
    setValue(`itens.${index}.servico_id`, s.id);
    setValue(`itens.${index}.material_id`, null);
    setValue(`itens.${index}.descricao`, s.descricao_completa || s.descricao, {
      shouldValidate: true,
    });
    if (s.unidade_padrao) {
      setValue(
        `itens.${index}.unidade_medida`,
        UNIDADE_ITEM[s.unidade_padrao] ?? s.unidade_padrao,
      );
    }
    if (s.preco_unitario > 0) {
      setValue(`itens.${index}.valor_unit_mao_obra`, s.preco_unitario);
    }
  }

  // Preenche o item a partir de um material.
  function preencherMaterial(index: number, m: MaterialResumo) {
    setValue(`itens.${index}.material_id`, m.id);
    setValue(`itens.${index}.servico_id`, null);
    setValue(`itens.${index}.descricao`, m.descricao, { shouldValidate: true });
    if (m.unidade_medida) {
      setValue(`itens.${index}.unidade_medida`, m.unidade_medida);
    }
    if (m.valor_referencia && m.valor_referencia > 0) {
      setValue(`itens.${index}.valor_unit_material`, m.valor_referencia);
    }
    if (m.valor_mao_obra && m.valor_mao_obra > 0) {
      setValue(`itens.${index}.valor_unit_mao_obra`, m.valor_mao_obra);
    }
  }

  // Ao escolher um item do catálogo (serviço ou material), preenche os campos.
  function aplicarCatalogo(index: number, valor: string) {
    if (valor.startsWith("srv:")) {
      const s = servicos.find((x) => x.id === valor.slice(4));
      if (s) preencherServico(index, s);
    } else if (valor.startsWith("mat:")) {
      const m = materiais.find((x) => x.id === valor.slice(4));
      if (m) preencherMaterial(index, m);
    } else {
      setValue(`itens.${index}.material_id`, null);
      setValue(`itens.${index}.servico_id`, null);
    }
  }

  // Item cadastrado na hora pelo modal do seletor: entra no catálogo e no item.
  function handleItemCriado(index: number, criado: CriadoCatalogo) {
    if (criado.tipo === "servico") {
      setServicos((prev) => [criado.item, ...prev]);
      preencherServico(index, criado.item);
    } else {
      setMateriais((prev) => [criado.item, ...prev]);
      preencherMaterial(index, criado.item);
    }
  }

  const onSubmit: SubmitHandler<OrcamentoFormValues> = async (values) => {
    const input: OrcamentoInput = {
      numero: values.numero || null,
      empresa_id: values.empresa_id,
      cliente_id: values.cliente_id,
      responsavel: values.responsavel,
      descricao: values.descricao,
      endereco: values.endereco || null,
      cidade: values.cidade || null,
      estado: values.estado || null,
      engenheiro_responsavel: values.engenheiro_responsavel || null,
      crea_engenheiro: values.crea_engenheiro || null,
      prazo_execucao: values.prazo_execucao || null,
      condicoes_pagamento: values.condicoes_pagamento || null,
      status: values.status,
      data_envio: values.data_envio || null,
      data_validade: values.data_validade || null,
      observacoes: values.observacoes || null,
      emite_nota_unica_servico: values.emite_nota_unica_servico ?? false,
      itens: values.itens.map((i) => ({
        secao: i.secao ?? "",
        material_id: i.material_id || null,
        servico_id: i.servico_id || null,
        descricao: i.descricao,
        unidade_medida: i.unidade_medida,
        quantidade: i.quantidade,
        valor_unit_mao_obra: i.valor_unit_mao_obra,
        valor_unit_material: i.valor_unit_material,
      })),
    };

    const res =
      isEdit && initialData
        ? await updateOrcamento(initialData.id, input)
        : await createOrcamento(input);

    if (!res.ok) {
      toast.error("Erro ao salvar", { description: res.error });
      return;
    }
    limparRascunho();
    toast.success(isEdit ? "Orçamento atualizado" : "Orçamento criado");
    const destino =
      isEdit && initialData
        ? `/comercial/orcamentos/${initialData.id}`
        : "id" in res
          ? `/comercial/orcamentos/${res.id}`
          : "/comercial/orcamentos";
    router.push(destino);
    router.refresh();
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

      {rascunho ? (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="size-9 shrink-0 rounded-md bg-amber-100 text-amber-700 grid place-items-center">
              <RotateCcw className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-900">
                Rascunho não salvo encontrado
              </div>
              <p className="text-xs text-amber-700/90">
                Você tem alterações desta proposta que não chegaram a ser
                salvas. Deseja restaurá-las?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={descartarRascunho}
              className="gap-1.5 border-amber-300 bg-transparent hover:bg-amber-100"
            >
              <X className="size-3.5" />
              Descartar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={restaurarRascunho}
              className="gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
            >
              <RotateCcw className="size-3.5" />
              Restaurar
            </Button>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
            <CardDescription>Dados gerais da proposta</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Empresa emissora *" error={errors.empresa_id?.message}>
              <NativeSelect {...register("empresa_id")}>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome} — {e.razao_social}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Número" error={errors.numero?.message}>
              <Input
                {...register("numero")}
                placeholder="ORC-2026-0001"
                readOnly={!isEdit}
                className={cn(!isEdit && "bg-muted/50")}
              />
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
              <input type="hidden" {...register("cliente_id")} />
              <ClientePicker
                value={watch("cliente_id")}
                onChange={(id, cliente) => {
                  setValue("cliente_id", id, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  if (id && !watch("cidade") && cliente?.cidade) {
                    setValue("cidade", cliente.cidade);
                  }
                  if (id && !watch("estado") && cliente?.estado) {
                    setValue("estado", cliente.estado);
                  }
                }}
                error={errors.cliente_id?.message}
              />
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
                    {ORCAMENTO_STATUS_LABEL[s as OrcamentoStatus]}
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
          <CardHeader>
            <CardTitle>Emissão fiscal (Omie)</CardTitle>
            <CardDescription>
              Como a nota será emitida ao fechar a obra
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register("emite_nota_unica_servico")}
                className="mt-0.5 size-4 rounded border-input accent-primary"
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">
                  Emitir como NFS única (material como serviço)
                </span>
                <span className="block text-xs text-muted-foreground">
                  Quando marcado, o export pro Omie sai como uma única Ordem de
                  Serviço, com o material lançado como serviço — em vez de NFS + NF
                  (Ordem de Serviço + Pedido de Venda) separadas.
                </span>
              </span>
            </label>
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
                  servico_id: null,
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

            <div className="space-y-3">
              {fields.map((field, index) => {
                const atualUn = watchedItens?.[index]?.unidade_medida ?? "";
                const opcoesUn =
                  atualUn && !UNIDADES_ITEM_OPCOES.includes(atualUn)
                    ? [atualUn, ...UNIDADES_ITEM_OPCOES]
                    : UNIDADES_ITEM_OPCOES;
                return (
                  <div
                    key={field.id}
                    className="rounded-lg border bg-card/40 p-3 space-y-2.5"
                  >
                    {/* Cabeçalho do item: número + seção + remover */}
                    <div className="flex items-center gap-2">
                      <span className="size-6 shrink-0 grid place-items-center rounded-md bg-muted text-[11px] font-mono font-semibold text-muted-foreground">
                        {index + 1}
                      </span>
                      <input
                        {...register(`itens.${index}.secao` as const)}
                        list="secoes-sugeridas"
                        placeholder="Seção (ex.: SINALIZAÇÃO HORIZONTAL)"
                        className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-[11px] uppercase tracking-wider font-semibold text-foreground/80"
                      />
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
                    </div>

                    {/* Catálogo + descrição */}
                    <input
                      type="hidden"
                      {...register(`itens.${index}.material_id` as const)}
                    />
                    <CatalogoPicker
                      servicos={servicos}
                      materiais={materiais}
                      value={
                        watchedItens?.[index]?.servico_id
                          ? `srv:${watchedItens[index]?.servico_id}`
                          : watchedItens?.[index]?.material_id
                            ? `mat:${watchedItens[index]?.material_id}`
                            : ""
                      }
                      onChange={(v) => aplicarCatalogo(index, v)}
                      onCreate={(criado) => handleItemCriado(index, criado)}
                    />
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

                    {/* Valores */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      <ItemCampo label="Un.">
                        <select
                          {...register(`itens.${index}.unidade_medida` as const)}
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                        >
                          {opcoesUn.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </ItemCampo>
                      <ItemCampo label="Qtd.">
                        <Input
                          type="number"
                          step="0.001"
                          {...register(`itens.${index}.quantidade` as const, {
                            valueAsNumber: true,
                          })}
                          className="h-9 text-right tabular-nums"
                        />
                      </ItemCampo>
                      <ItemCampo label="MO unit. (R$)">
                        <Input
                          type="number"
                          step="0.01"
                          {...register(
                            `itens.${index}.valor_unit_mao_obra` as const,
                            { valueAsNumber: true },
                          )}
                          className="h-9 text-right tabular-nums"
                        />
                      </ItemCampo>
                      <ItemCampo label="Mat. unit. (R$)">
                        <Input
                          type="number"
                          step="0.01"
                          {...register(
                            `itens.${index}.valor_unit_material` as const,
                            { valueAsNumber: true },
                          )}
                          className="h-9 text-right tabular-nums"
                        />
                      </ItemCampo>
                      <ItemCampo label="Subtotal" className="col-span-2 sm:col-span-1">
                        <div className="h-9 px-3 rounded-md border bg-muted/40 flex items-center justify-end font-semibold tabular-nums text-sm">
                          {formatBRL(subtotais[index]?.total ?? 0)}
                        </div>
                      </ItemCampo>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totais gerais */}
            <div className="mt-4 flex flex-col items-end gap-1 border-t-2 border-foreground/10 pt-3">
              <div className="flex flex-wrap justify-end gap-x-8 gap-y-1 text-sm">
                <span className="text-muted-foreground">
                  Total MO:{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatBRL(totaisGerais.mao_obra)}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Total Mat.:{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatBRL(totaisGerais.material)}
                  </span>
                </span>
              </div>
              <div className="text-lg font-bold tabular-nums">
                Total Geral: {formatBRL(totaisGerais.total)}
              </div>
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

function ItemCampo({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </Label>
      {children}
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
