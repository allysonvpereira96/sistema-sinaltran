"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, FileSearch, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  atualizarColaboradorPelaFicha,
  type ColaboradorInput,
} from "@/lib/actions/colaboradores";
import { extrairFichaEmpregado, type FichaExtraida } from "@/lib/actions/ficha";
import type { Colaborador, ColaboradorDependente } from "@/lib/mocks/colaboradores";
import { formatBRL, formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tipo = "data" | "moeda" | "pct";
type Campo = { key: keyof FichaExtraida & keyof ColaboradorInput; label: string; tipo?: Tipo };

const CAMPOS: Campo[] = [
  { key: "nome_completo", label: "Nome completo" },
  { key: "matricula", label: "Matrícula" },
  { key: "cpf", label: "CPF" },
  { key: "rg", label: "RG" },
  { key: "data_nascimento", label: "Nascimento", tipo: "data" },
  { key: "genero", label: "Gênero" },
  { key: "pis", label: "PIS/PASEP" },
  { key: "cargo", label: "Cargo" },
  { key: "data_admissao", label: "Admissão", tipo: "data" },
  { key: "email", label: "E-mail" },
  { key: "telefone", label: "Telefone" },
  { key: "endereco", label: "Endereço" },
  { key: "cidade", label: "Cidade" },
  { key: "estado", label: "Estado" },
  { key: "cep", label: "CEP" },
  { key: "banco", label: "Banco" },
  { key: "agencia", label: "Agência" },
  { key: "conta", label: "Conta" },
  { key: "remuneracao_base", label: "Salário base", tipo: "moeda" },
  { key: "nome_pai", label: "Nome do pai" },
  { key: "nome_mae", label: "Nome da mãe" },
  { key: "estado_civil", label: "Estado civil" },
  { key: "naturalidade", label: "Naturalidade" },
  { key: "naturalidade_uf", label: "UF naturalidade" },
  { key: "nacionalidade", label: "Nacionalidade" },
  { key: "raca_cor", label: "Raça/cor" },
  { key: "grau_instrucao", label: "Grau de instrução" },
  { key: "ctps_numero", label: "CTPS nº" },
  { key: "ctps_serie", label: "CTPS série" },
  { key: "titulo_eleitor", label: "Título de eleitor" },
  { key: "cbo", label: "CBO" },
  { key: "matricula_esocial", label: "Matrícula eSocial" },
  { key: "insalubridade_pct", label: "Insalubridade (%)", tipo: "pct" },
  { key: "periculosidade_pct", label: "Periculosidade (%)", tipo: "pct" },
  { key: "sindicato", label: "Sindicato" },
  { key: "horario_trabalho", label: "Horário" },
];

const DEPS_KEY = "__dependentes__";

function isEmpty(v: unknown): boolean {
  return v == null || (typeof v === "string" && v.trim() === "");
}

function display(v: unknown, tipo?: Tipo): string {
  if (isEmpty(v)) return "—";
  if (tipo === "data") return formatDateBR(String(v));
  if (tipo === "moeda") return formatBRL(Number(v));
  if (tipo === "pct") return `${Number(v)}%`;
  return String(v);
}

type DiffRow = {
  key: string;
  label: string;
  atual: string;
  novo: string;
  valorNovo: unknown;
  acao: "preencher" | "corrigir";
};

type NovoDependente = { nome: string; parentesco?: string | null; data_nascimento?: string | null };

function buildDiff(
  ficha: FichaExtraida,
  colaborador: Colaborador,
  dependentesAtuais: ColaboradorDependente[],
): { diffs: DiffRow[]; novosDeps: NovoDependente[] } {
  const rows: DiffRow[] = [];
  const c = colaborador as unknown as Record<string, unknown>;
  const f = ficha as unknown as Record<string, unknown>;
  for (const campo of CAMPOS) {
    const novoRaw = f[campo.key];
    if (isEmpty(novoRaw)) continue;
    const atualRaw = c[campo.key];
    let acao: "preencher" | "corrigir";
    if (isEmpty(atualRaw)) {
      acao = "preencher";
    } else {
      const igual =
        campo.tipo === "moeda" || campo.tipo === "pct"
          ? Number(atualRaw) === Number(novoRaw)
          : String(atualRaw).trim().toLowerCase() === String(novoRaw).trim().toLowerCase();
      if (igual) continue;
      acao = "corrigir";
    }
    rows.push({
      key: campo.key,
      label: campo.label,
      atual: display(atualRaw, campo.tipo),
      novo: display(novoRaw, campo.tipo),
      valorNovo: novoRaw,
      acao,
    });
  }
  const nomesAtuais = new Set(dependentesAtuais.map((d) => d.nome.trim().toLowerCase()));
  const novosDeps = (ficha.dependentes ?? [])
    .filter((d) => d?.nome?.trim() && !nomesAtuais.has(d.nome.trim().toLowerCase()))
    .map((d) => ({ nome: d.nome, parentesco: d.parentesco ?? null, data_nascimento: d.data_nascimento ?? null }));
  return { diffs: rows, novosDeps };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AtualizarFichaDialog({
  colaborador,
  dependentesAtuais,
}: {
  colaborador: Colaborador;
  dependentesAtuais: ColaboradorDependente[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [importando, setImportando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [ficha, setFicha] = useState<FichaExtraida | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const { diffs, novosDeps } = useMemo(
    () => (ficha ? buildDiff(ficha, colaborador, dependentesAtuais) : { diffs: [] as DiffRow[], novosDeps: [] as NovoDependente[] }),
    [ficha, colaborador, dependentesAtuais],
  );

  async function handleFile(file: File) {
    setImportando(true);
    setFicha(null);
    try {
      const base64 = await fileToBase64(file);
      const res = await extrairFichaEmpregado(base64, file.type);
      if (!res.ok) {
        toast.error("Não foi possível ler a ficha", { description: res.error });
        return;
      }
      setFicha(res.data);
      // pré-marca tudo
      const { diffs: dd, novosDeps: nd } = buildDiff(res.data, colaborador, dependentesAtuais);
      const inicial = new Set(dd.map((d) => d.key));
      if (nd.length) inicial.add(DEPS_KEY);
      setSelecionados(inicial);
    } catch {
      toast.error("Falha ao ler o arquivo.");
    } finally {
      setImportando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function toggle(key: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const totalSelecionado =
    diffs.filter((d) => selecionados.has(d.key)).length +
    (novosDeps.length && selecionados.has(DEPS_KEY) ? 1 : 0);

  async function aplicar() {
    const patch: Partial<ColaboradorInput> = {};
    for (const d of diffs) {
      if (selecionados.has(d.key)) {
        (patch as Record<string, unknown>)[d.key] = d.valorNovo;
      }
    }
    const deps = selecionados.has(DEPS_KEY) ? novosDeps : [];
    if (Object.keys(patch).length === 0 && deps.length === 0) {
      toast.info("Nada selecionado para aplicar.");
      return;
    }
    setAplicando(true);
    try {
      const res = await atualizarColaboradorPelaFicha(colaborador.id, patch, deps);
      if (!res.ok) {
        toast.error("Erro ao aplicar", { description: res.error });
        return;
      }
      toast.success("Cadastro atualizado pela ficha.");
      setOpen(false);
      setFicha(null);
      router.refresh();
    } finally {
      setAplicando(false);
    }
  }

  const semMudancas = ficha != null && diffs.length === 0 && novosDeps.length === 0;

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <FileSearch className="size-4" />
        Atualizar pela ficha
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Atualizar {colaborador.nome_completo} pela ficha</DialogTitle>
            <DialogDescription>
              Suba o PDF da ficha. A IA compara com o cadastro atual e mostra o que vai preencher e corrigir — você aprova.
            </DialogDescription>
          </DialogHeader>

          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {!ficha ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">Selecione o PDF (ou imagem) da ficha de registro.</p>
              <Button onClick={() => fileRef.current?.click()} disabled={importando} className="gap-2">
                {importando ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {importando ? "Lendo ficha…" : "Escolher arquivo"}
              </Button>
            </div>
          ) : semMudancas ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-center">
              <CheckCircle2 className="size-8 text-emerald-500" />
              <p className="text-sm">A ficha não trouxe nada diferente do cadastro atual.</p>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                Tentar outra ficha
              </Button>
            </div>
          ) : (
            <div className="overflow-y-auto -mx-1 px-1 divide-y">
              {diffs.map((d) => (
                <label key={d.key} className="flex items-start gap-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 rounded border-input"
                    checked={selecionados.has(d.key)}
                    onChange={() => toggle(d.key)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{d.label}</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] font-semibold",
                          d.acao === "preencher" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
                        )}
                      >
                        {d.acao === "preencher" ? "Preencher" : "Corrigir"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      <span className="line-through opacity-70">{d.atual}</span>
                      <span className="mx-1.5">→</span>
                      <span className="text-foreground font-medium">{d.novo}</span>
                    </div>
                  </div>
                </label>
              ))}

              {novosDeps.length > 0 && (
                <label className="flex items-start gap-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 rounded border-input"
                    checked={selecionados.has(DEPS_KEY)}
                    onChange={() => toggle(DEPS_KEY)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Dependentes</span>
                      <Badge variant="secondary" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        Adicionar {novosDeps.length}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {novosDeps.map((d) => `${d.nome}${d.data_nascimento ? ` (${formatDateBR(d.data_nascimento)})` : ""}`).join(" · ")}
                    </div>
                  </div>
                </label>
              )}
            </div>
          )}

          {ficha && !semMudancas && (
            <DialogFooter>
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={aplicando}>
                Trocar ficha
              </Button>
              <Button onClick={aplicar} disabled={aplicando || totalSelecionado === 0} className="gap-2">
                {aplicando ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Aplicar {totalSelecionado > 0 ? `(${totalSelecionado})` : ""}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
