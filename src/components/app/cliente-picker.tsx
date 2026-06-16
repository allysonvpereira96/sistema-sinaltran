"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Search,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  searchClientes,
  getClienteById,
  getClienteByCnpj,
  lookupCnpj,
  createCliente,
} from "@/lib/actions/clientes";
import { onlyDigits, isValidCnpj, formatCnpjCpf } from "@/lib/cnpj";
import type { ClienteRow } from "@/lib/types/cliente";
import { cn } from "@/lib/utils";

type Props = {
  value?: string | null;
  onChange: (clienteId: string, cliente: ClienteRow) => void;
  error?: string;
  className?: string;
};

export function ClientePicker({ value, onChange, error, className }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClienteRow[]>([]);
  const [selected, setSelected] = useState<ClienteRow | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitialCnpj, setCreateInitialCnpj] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);

  // -- Carrega o cliente selecionado quando recebemos um value (modo edit)
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (selected?.id === value) return;
    getClienteById(value).then((c) => {
      if (c) setSelected(c);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // -- Busca com debounce
  useEffect(() => {
    if (!isOpen) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setIsLoading(true);
      try {
        const rows = await searchClientes(q, 12);
        setResults(rows);
      } finally {
        setIsLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, isOpen]);

  // -- Fecha o dropdown ao clicar fora
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isOpen]);

  function handleSelect(cliente: ClienteRow) {
    setSelected(cliente);
    setQuery("");
    setResults([]);
    setIsOpen(false);
    onChange(cliente.id, cliente);
  }

  function handleClear() {
    setSelected(null);
    setQuery("");
    onChange("", {} as ClienteRow);
  }

  function handleNewFromQuery() {
    // Se o usuário digitou um CNPJ na busca, pré-popula
    const digits = onlyDigits(query);
    setCreateInitialCnpj(digits.length >= 11 ? digits : "");
    setCreateOpen(true);
    setIsOpen(false);
  }

  function handleCreated(novo: ClienteRow) {
    setSelected(novo);
    setQuery("");
    setResults([]);
    setCreateOpen(false);
    onChange(novo.id, novo);
  }

  return (
    <>
      <div ref={containerRef} className={cn("relative", className)}>
        {/* === Modo: cliente selecionado === */}
        {selected ? (
          <div
            className={cn(
              "flex items-start gap-3 rounded-md border bg-background px-3 py-2.5",
              error ? "border-rose-500" : "border-input",
            )}
          >
            <div className="size-9 rounded-md bg-primary/10 grid place-items-center shrink-0 mt-0.5">
              <Building2 className="size-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-tight truncate">
                {selected.nome_fantasia || selected.razao_social}
              </div>
              {selected.nome_fantasia && (
                <div className="text-xs text-muted-foreground truncate">
                  {selected.razao_social}
                </div>
              )}
              <div className="text-[11px] text-muted-foreground font-mono mt-0.5 flex gap-2 flex-wrap">
                {selected.cnpj_cpf && (
                  <span>{formatCnpjCpf(selected.cnpj_cpf)}</span>
                )}
                {(selected.cidade || selected.estado) && (
                  <span>
                    · {selected.cidade}
                    {selected.estado ? `/${selected.estado}` : ""}
                  </span>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleClear}
              aria-label="Trocar cliente"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          /* === Modo: busca === */
          <>
            <div
              className={cn(
                "flex items-center gap-2 h-10 rounded-md border bg-background px-3 text-sm transition-colors",
                error ? "border-rose-500" : "border-input",
                isOpen && "ring-2 ring-ring/40",
              )}
            >
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder="Digite o nome ou CNPJ do cliente…"
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70"
              />
              {isLoading && (
                <Loader2 className="size-4 shrink-0 text-muted-foreground animate-spin" />
              )}
            </div>

            {/* === Dropdown de resultados === */}
            {isOpen && (
              <div className="absolute z-30 mt-1.5 w-full rounded-md border bg-popover shadow-lg overflow-hidden">
                {query.trim().length < 2 ? (
                  <div className="px-4 py-3 text-xs text-muted-foreground">
                    Digite pelo menos 2 caracteres para buscar…
                  </div>
                ) : results.length === 0 && !isLoading ? (
                  <div className="px-4 py-6 text-center space-y-3">
                    <div className="text-xs text-muted-foreground">
                      Nenhum cliente encontrado com{" "}
                      <span className="font-semibold">“{query}”</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleNewFromQuery}
                      className="gap-2"
                    >
                      <Plus className="size-3.5" />
                      Cadastrar novo cliente
                    </Button>
                  </div>
                ) : (
                  <>
                    <ul className="max-h-72 overflow-y-auto">
                      {results.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => handleSelect(c)}
                            className="w-full text-left px-3 py-2 hover:bg-muted flex items-start gap-3 transition-colors"
                          >
                            <div className="size-8 rounded bg-muted grid place-items-center shrink-0 mt-0.5">
                              <Building2 className="size-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium leading-tight truncate">
                                {c.nome_fantasia || c.razao_social}
                              </div>
                              {c.nome_fantasia && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {c.razao_social}
                                </div>
                              )}
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5 flex gap-2 flex-wrap">
                                {c.cnpj_cpf && (
                                  <span>{formatCnpjCpf(c.cnpj_cpf)}</span>
                                )}
                                {c.cidade && (
                                  <span>
                                    · {c.cidade}
                                    {c.estado ? `/${c.estado}` : ""}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t bg-muted/40">
                      <button
                        type="button"
                        onClick={handleNewFromQuery}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted flex items-center gap-2 text-xs font-medium text-primary"
                      >
                        <Plus className="size-3.5" />
                        Cadastrar novo cliente
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <NovoClienteModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialCnpj={createInitialCnpj}
        onCreated={handleCreated}
      />
    </>
  );
}

/* ===========================================================================
 * Modal de cadastro novo cliente — com busca automática na BrasilAPI por CNPJ
 * ======================================================================== */

function NovoClienteModal({
  open,
  onOpenChange,
  initialCnpj,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCnpj: string;
  onCreated: (c: ClienteRow) => void;
}) {
  const [cnpj, setCnpj] = useState("");
  const [lookupState, setLookupState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ok"; data: NonNullable<Awaited<ReturnType<typeof lookupCnpj>>> }
    | { status: "not_found" }
    | { status: "invalid" }
    | { status: "error" }
  >({ status: "idle" });
  const [form, setForm] = useState({
    razao_social: "",
    nome_fantasia: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    responsavel: "",
  });
  const [isPending, startTransition] = useTransition();

  // Reset ao abrir
  useEffect(() => {
    if (!open) return;
    setCnpj(initialCnpj);
    setLookupState({ status: "idle" });
    setForm({
      razao_social: "",
      nome_fantasia: "",
      email: "",
      telefone: "",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
      responsavel: "",
    });
  }, [open, initialCnpj]);

  // Auto-lookup quando CNPJ tem 14 dígitos válidos
  const cnpjDigits = onlyDigits(cnpj);
  const autoLookup = useCallback(async (digits: string) => {
    // Primeiro: verificar se já existe no nosso DB
    const existente = await getClienteByCnpj(digits);
    if (existente) {
      toast.info("Cliente já cadastrado", {
        description: existente.razao_social,
      });
      onCreated(existente);
      return;
    }
    if (!isValidCnpj(digits)) {
      setLookupState({ status: "invalid" });
      return;
    }
    setLookupState({ status: "loading" });
    const data = await lookupCnpj(digits);
    if (!data) {
      setLookupState({ status: "not_found" });
      return;
    }
    setLookupState({ status: "ok", data });
    setForm({
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia ?? "",
      email: data.email ?? "",
      telefone: data.telefone ?? "",
      endereco: data.endereco ?? "",
      cidade: data.cidade ?? "",
      estado: data.estado ?? "",
      cep: data.cep ?? "",
      responsavel: "",
    });
  }, [onCreated]);

  // Auto-fire quando o usuário cola um CNPJ completo (14 dig)
  useEffect(() => {
    if (!open) return;
    if (cnpjDigits.length !== 14) return;
    if (lookupState.status === "loading" || lookupState.status === "ok") return;
    autoLookup(cnpjDigits);
  }, [cnpjDigits, autoLookup, open, lookupState.status]);

  function handleManualLookup() {
    if (!cnpjDigits) return;
    autoLookup(cnpjDigits);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.razao_social.trim()) {
      toast.error("Informe a razão social");
      return;
    }
    startTransition(async () => {
      const res = await createCliente({
        razao_social: form.razao_social,
        nome_fantasia: form.nome_fantasia || null,
        cnpj_cpf: cnpjDigits || null,
        email: form.email || null,
        telefone: form.telefone || null,
        endereco: form.endereco || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        cep: form.cep || null,
        responsavel: form.responsavel || null,
      });
      if (!res.ok) {
        toast.error("Erro ao cadastrar cliente", { description: res.error });
        return;
      }
      toast.success("Cliente cadastrado", {
        description: res.cliente.razao_social,
      });
      onCreated(res.cliente);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cadastrar novo cliente</DialogTitle>
          <DialogDescription>
            Digite o CNPJ para preenchimento automático via Receita Federal, ou
            preencha manualmente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* === CNPJ + lookup === */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              CNPJ
            </Label>
            <div className="flex gap-2">
              <Input
                value={cnpj}
                onChange={(e) => {
                  setCnpj(e.target.value);
                  setLookupState({ status: "idle" });
                }}
                placeholder="00.000.000/0000-00"
                inputMode="numeric"
                maxLength={18}
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleManualLookup}
                disabled={
                  cnpjDigits.length < 11 ||
                  lookupState.status === "loading"
                }
                className="gap-2 shrink-0"
              >
                {lookupState.status === "loading" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                Consultar
              </Button>
            </div>
            <LookupStatusBadge state={lookupState} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ModalField label="Razão social *">
              <Input
                value={form.razao_social}
                onChange={(e) =>
                  setForm({ ...form, razao_social: e.target.value })
                }
                required
              />
            </ModalField>
            <ModalField label="Nome fantasia">
              <Input
                value={form.nome_fantasia}
                onChange={(e) =>
                  setForm({ ...form, nome_fantasia: e.target.value })
                }
              />
            </ModalField>
            <ModalField label="E-mail">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </ModalField>
            <ModalField label="Telefone">
              <Input
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />
            </ModalField>
            <ModalField label="Endereço" className="sm:col-span-2">
              <Input
                value={form.endereco}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              />
            </ModalField>
            <ModalField label="Cidade">
              <Input
                value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              />
            </ModalField>
            <ModalField label="UF">
              <Input
                value={form.estado}
                onChange={(e) =>
                  setForm({ ...form, estado: e.target.value.toUpperCase() })
                }
                maxLength={2}
              />
            </ModalField>
            <ModalField label="CEP">
              <Input
                value={form.cep}
                onChange={(e) => setForm({ ...form, cep: e.target.value })}
              />
            </ModalField>
            <ModalField label="Responsável (contato)">
              <Input
                value={form.responsavel}
                onChange={(e) =>
                  setForm({ ...form, responsavel: e.target.value })
                }
              />
            </ModalField>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Cadastrar cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LookupStatusBadge({
  state,
}: {
  state:
    | { status: "idle" }
    | { status: "loading" }
    | { status: "ok"; data: { razao_social: string; situacao: string | null } }
    | { status: "not_found" }
    | { status: "invalid" }
    | { status: "error" };
}) {
  if (state.status === "idle") return null;
  if (state.status === "loading") {
    return (
      <p className="text-[11px] flex items-center gap-1.5 text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Consultando Receita Federal…
      </p>
    );
  }
  if (state.status === "ok") {
    return (
      <p className="text-[11px] flex items-center gap-1.5 text-emerald-700">
        <CheckCircle2 className="size-3" />
        Dados preenchidos automaticamente.{" "}
        {state.data.situacao && (
          <span className="font-medium">({state.data.situacao})</span>
        )}
      </p>
    );
  }
  if (state.status === "invalid") {
    return (
      <p className="text-[11px] flex items-center gap-1.5 text-amber-700">
        <AlertCircle className="size-3" />
        CNPJ inválido (dígitos verificadores não conferem). Preencha manualmente.
      </p>
    );
  }
  if (state.status === "not_found") {
    return (
      <p className="text-[11px] flex items-center gap-1.5 text-amber-700">
        <AlertCircle className="size-3" />
        CNPJ não encontrado na Receita Federal. Preencha manualmente.
      </p>
    );
  }
  return (
    <p className="text-[11px] flex items-center gap-1.5 text-rose-700">
      <AlertCircle className="size-3" />
      Falha ao consultar. Tente novamente ou preencha manualmente.
    </p>
  );
}

function ModalField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
        {label}
      </Label>
      {children}
    </div>
  );
}
