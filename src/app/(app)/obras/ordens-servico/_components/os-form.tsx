"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, ArrowLeft, Plus, X, Search, GripVertical } from "lucide-react";
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
  createOrdemServico,
  updateOrdemServico,
  type OSInput,
} from "@/lib/actions/ordens-servico";
import { OS_STATUS_LABEL, type OSDetalhe, type OSStatus } from "@/lib/types/os";
import { normalizeSearch } from "@/lib/format";
import { cn } from "@/lib/utils";

const osStatusValues = [
  "aberta",
  "em_andamento",
  "concluida",
  "cancelada",
] as const;

const osSchema = z.object({
  numero: z.string().optional().or(z.literal("")),
  obra_id: z.string().min(1, "Obra é obrigatória"),
  pedido_omie: z.string().optional().or(z.literal("")),
  data: z.string().min(1, "Data é obrigatória"),
  hora_saida: z.string().optional().or(z.literal("")),
  hora_chegada: z.string().optional().or(z.literal("")),
  cidade: z.string().optional().or(z.literal("")),
  veiculo_id: z.string().optional().or(z.literal("")),
  encarregado_id: z.string().optional().or(z.literal("")),
  motorista_id: z.string().optional().or(z.literal("")),
  km_inicial: z.number().nullable().optional(),
  km_final: z.number().nullable().optional(),
  diaristas: z.string().optional().or(z.literal("")),
  status: z.enum(osStatusValues),
  observacoes: z.string().optional().or(z.literal("")),
});

type OSFormValues = z.infer<typeof osSchema>;

export type ObraOption = {
  id: string;
  numero: string;
  nome: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  cidade: string | null;
};
export type VeiculoOption = {
  id: string;
  codigo: string;
  descricao: string;
  placa: string | null;
};
export type ColaboradorOption = {
  id: string;
  nome_completo: string;
  cargo: string | null;
};

function osToValues(os: OSDetalhe): OSFormValues {
  return {
    numero: os.numero,
    obra_id: os.obra_id ?? "",
    pedido_omie: os.pedido_omie ?? "",
    data: os.data ?? "",
    hora_saida: os.hora_saida?.slice(0, 5) ?? "",
    hora_chegada: os.hora_chegada?.slice(0, 5) ?? "",
    cidade: os.cidade ?? "",
    veiculo_id: os.veiculo_id ?? "",
    encarregado_id: os.encarregado_id ?? "",
    motorista_id: os.motorista_id ?? "",
    km_inicial: os.km_inicial,
    km_final: os.km_final,
    diaristas: os.diaristas ?? "",
    status: os.status,
    observacoes: os.observacoes ?? "",
  };
}

const hoje = () => new Date().toISOString().slice(0, 10);

export function OSForm({
  mode,
  initialData,
  numeroSugerido,
  obras,
  veiculos,
  colaboradores,
}: {
  mode: "create" | "edit";
  initialData?: OSDetalhe;
  numeroSugerido?: string;
  obras: ObraOption[];
  veiculos: VeiculoOption[];
  colaboradores: ColaboradorOption[];
}) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [equipe, setEquipe] = useState<string[]>(
    initialData?.equipe.map((m) => m.colaborador_id) ?? [],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OSFormValues>({
    resolver: zodResolver(osSchema),
    defaultValues: initialData
      ? osToValues(initialData)
      : {
          numero: numeroSugerido ?? "",
          obra_id: "",
          pedido_omie: "",
          data: hoje(),
          hora_saida: "",
          hora_chegada: "",
          cidade: "",
          veiculo_id: "",
          encarregado_id: "",
          motorista_id: "",
          km_inicial: null,
          km_final: null,
          diaristas: "",
          status: "aberta",
          observacoes: "",
        },
  });

  useEffect(() => {
    if (initialData) {
      reset(osToValues(initialData));
      setEquipe(initialData.equipe.map((m) => m.colaborador_id));
    }
  }, [initialData, reset]);

  const obraId = watch("obra_id");
  const obraSel = useMemo(
    () => obras.find((o) => o.id === obraId) ?? null,
    [obras, obraId],
  );

  function handleObraChange(id: string) {
    setValue("obra_id", id, { shouldValidate: true, shouldDirty: true });
    const obra = obras.find((o) => o.id === id);
    if (obra) {
      if (!watch("cidade") && obra.cidade) setValue("cidade", obra.cidade);
    }
  }

  const onSubmit: SubmitHandler<OSFormValues> = async (values) => {
    const input: OSInput = {
      numero: values.numero || null,
      obra_id: values.obra_id,
      cliente_id: obraSel?.cliente_id ?? null,
      pedido_omie: values.pedido_omie || null,
      data: values.data,
      hora_saida: values.hora_saida || null,
      hora_chegada: values.hora_chegada || null,
      cidade: values.cidade || null,
      veiculo_id: values.veiculo_id || null,
      encarregado_id: values.encarregado_id || null,
      motorista_id: values.motorista_id || null,
      km_inicial: values.km_inicial ?? null,
      km_final: values.km_final ?? null,
      diaristas: values.diaristas || null,
      status: values.status,
      observacoes: values.observacoes || null,
      equipe,
    };

    const res =
      isEdit && initialData
        ? await updateOrdemServico(initialData.id, input)
        : await createOrdemServico(input);

    if (!res.ok) {
      toast.error("Erro ao salvar", { description: res.error });
      return;
    }
    toast.success(isEdit ? "O.S atualizada" : "O.S criada");
    const destino =
      isEdit && initialData
        ? `/obras/ordens-servico/${initialData.id}`
        : "id" in res
          ? `/obras/ordens-servico/${res.id}`
          : "/obras/ordens-servico";
    router.push(destino);
    router.refresh();
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1100px] mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <Link
          href="/obras/ordens-servico"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          aria-label="Voltar para lista"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {isEdit ? "Editar O.S" : "Nova O.S"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Atualize os dados da ordem de serviço."
              : "Registro diário de equipe — vinculado a uma obra/orçamento."}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* === Identificação === */}
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
            <CardDescription>Obra, cliente e data da ordem de serviço</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Número da O.S" error={errors.numero?.message}>
              <Input
                {...register("numero")}
                placeholder="OS-2026-001"
                readOnly={!isEdit}
                className={cn(!isEdit && "bg-muted/50")}
              />
            </Field>
            <Field label="Status">
              <NativeSelect {...register("status")}>
                {osStatusValues.map((s) => (
                  <option key={s} value={s}>
                    {OS_STATUS_LABEL[s as OSStatus]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field
              label="Obra *"
              error={errors.obra_id?.message}
              className="sm:col-span-2"
            >
              <NativeSelect
                value={obraId}
                onChange={(e) => handleObraChange(e.target.value)}
              >
                <option value="">Selecione a obra…</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.numero} — {o.nome}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Cliente">
              <Input
                value={obraSel?.cliente_nome ?? ""}
                readOnly
                placeholder="Definido pela obra"
                className="bg-muted/50"
              />
            </Field>
            <Field label="Nº Pedido OMIE" error={errors.pedido_omie?.message}>
              <Input {...register("pedido_omie")} placeholder="Ex.: 123456" />
            </Field>
            <Field label="Data *" error={errors.data?.message}>
              <Input type="date" {...register("data")} />
            </Field>
            <Field label="Cidade" error={errors.cidade?.message}>
              <Input {...register("cidade")} placeholder="Congonhas / MG" />
            </Field>
          </CardContent>
        </Card>

        {/* === Deslocamento === */}
        <Card>
          <CardHeader>
            <CardTitle>Deslocamento</CardTitle>
            <CardDescription>Horários, veículo e quilometragem</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Hora de saída" error={errors.hora_saida?.message}>
              <Input type="time" {...register("hora_saida")} />
            </Field>
            <Field label="Hora de chegada" error={errors.hora_chegada?.message}>
              <Input type="time" {...register("hora_chegada")} />
            </Field>
            <Field label="Veículo" error={errors.veiculo_id?.message}>
              <NativeSelect {...register("veiculo_id")}>
                <option value="">Selecione…</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.descricao}
                    {v.placa ? ` (${v.placa})` : ""}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Km inicial" error={errors.km_inicial?.message}>
              <Input
                type="number"
                step="0.1"
                {...register("km_inicial", {
                  setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                })}
                placeholder="0"
              />
            </Field>
            <Field label="Km final" error={errors.km_final?.message}>
              <Input
                type="number"
                step="0.1"
                {...register("km_final", {
                  setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                })}
                placeholder="0"
              />
            </Field>
          </CardContent>
        </Card>

        {/* === Equipe === */}
        <Card>
          <CardHeader>
            <CardTitle>Equipe</CardTitle>
            <CardDescription>
              Encarregado, motorista e equipe CLT (colaboradores cadastrados)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Encarregado" error={errors.encarregado_id?.message}>
                <NativeSelect {...register("encarregado_id")}>
                  <option value="">Selecione…</option>
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_completo}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Motorista" error={errors.motorista_id?.message}>
                <NativeSelect {...register("motorista_id")}>
                  <option value="">Selecione…</option>
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_completo}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                Equipe CLT
              </Label>
              <EquipeSelector
                colaboradores={colaboradores}
                value={equipe}
                onChange={setEquipe}
              />
            </div>

            <Field label="Diaristas">
              <Textarea
                rows={2}
                {...register("diaristas")}
                placeholder="Nomes dos diaristas (um por linha ou separados por vírgula)"
              />
            </Field>
          </CardContent>
        </Card>

        {/* === Observações === */}
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={3}
              {...register("observacoes")}
              placeholder="Ex.: Robson chegou na casa no RJ às…"
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/obras/ordens-servico"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Cancelar
          </Link>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <Save className="size-4" />
            {isSubmitting ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar O.S"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ===========================================================================
 * Seletor de Equipe CLT — lista ordenada + busca para adicionar
 * ======================================================================== */
function EquipeSelector({
  colaboradores,
  value,
  onChange,
}: {
  colaboradores: ColaboradorOption[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const byId = useMemo(
    () => new Map(colaboradores.map((c) => [c.id, c])),
    [colaboradores],
  );

  const disponiveis = useMemo(() => {
    const q = normalizeSearch(query);
    return colaboradores
      .filter((c) => !value.includes(c.id))
      .filter((c) => !q || normalizeSearch(c.nome_completo).includes(q))
      .slice(0, 8);
  }, [colaboradores, value, query]);

  function add(id: string) {
    onChange([...value, id]);
    setQuery("");
  }
  function remove(id: string) {
    onChange(value.filter((x) => x !== id));
  }

  return (
    <div className="rounded-md border bg-background">
      {/* Lista selecionada */}
      {value.length === 0 ? (
        <p className="px-3 py-3 text-sm text-muted-foreground">
          Nenhum colaborador na equipe ainda.
        </p>
      ) : (
        <ul className="divide-y">
          {value.map((id, i) => {
            const c = byId.get(id);
            return (
              <li key={id} className="flex items-center gap-2 px-3 py-2">
                <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs font-mono text-muted-foreground w-5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {c?.nome_completo ?? "—"}
                  </div>
                  {c?.cargo ? (
                    <div className="text-xs text-muted-foreground truncate">
                      {c.cargo}
                    </div>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(id)}
                  aria-label="Remover da equipe"
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Busca para adicionar */}
      <div className="border-t p-2 space-y-2">
        <div className="flex items-center gap-2 h-9 rounded-md border bg-background px-2.5 text-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar colaborador para adicionar…"
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
          />
        </div>
        {query.trim() && (
          <ul className="max-h-48 overflow-y-auto rounded-md border">
            {disponiveis.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">
                Nenhum colaborador disponível.
              </li>
            ) : (
              disponiveis.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => add(c.id)}
                    className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2 transition-colors"
                  >
                    <Plus className="size-3.5 text-muted-foreground" />
                    <span className="flex-1 min-w-0">
                      <span className="text-sm font-medium block truncate">
                        {c.nome_completo}
                      </span>
                      {c.cargo ? (
                        <span className="text-xs text-muted-foreground block truncate">
                          {c.cargo}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
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
