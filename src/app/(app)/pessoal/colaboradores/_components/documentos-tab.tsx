"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TIPOS_DOCUMENTO,
  TIPOS_DOCUMENTO_GRUPOS,
  documentoTipoLabel,
  type ColaboradorDocumento,
} from "@/lib/mocks/colaboradores";
import {
  registrarDocumento,
  deleteDocumento,
  getDocumentoUrl,
} from "@/lib/actions/colaboradores";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";

const BUCKET = "colaborador-documentos";
/** Tamanho máximo individual (sanity check no front; o real é o do bucket). */
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
/** Quantos uploads simultâneos. */
const UPLOAD_CONCURRENCY = 3;

type PendenteStatus = "pendente" | "enviando" | "ok" | "erro";

/** Arquivo na fila de envio, com seu próprio título/tipo. */
type Pendente = {
  id: number;
  file: File;
  titulo: string;
  tipo: string;
  dias: string;
  status: PendenteStatus;
  erro?: string;
};

/** Select de tipo de documento reaproveitado (com optgroups). */
function TipoSelect({
  value,
  onChange,
  className,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50",
        className,
      )}
    >
      {TIPOS_DOCUMENTO_GRUPOS.map((g) => (
        <optgroup key={g} label={g}>
          {TIPOS_DOCUMENTO.filter((t) => t.grupo === g).map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function DocumentosTab({
  colaboradorId,
  documentos,
  readOnly = false,
}: {
  colaboradorId: string;
  documentos: ColaboradorDocumento[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [filtro, setFiltro] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  // capturado uma vez (inicializador lazy = pode ser impuro)
  const [agora] = useState(() => Date.now());

  function addFiles(files: FileList) {
    const novos: Pendente[] = Array.from(files).map((file) => ({
      id: ++seq.current,
      file,
      titulo: file.name.replace(/\.[^.]+$/, ""),
      tipo: "outros",
      dias: "",
      status: "pendente",
    }));
    setPendentes((p) => [...p, ...novos]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function patchPendente(id: number, patch: Partial<Pendente>) {
    setPendentes((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function removePendente(id: number) {
    setPendentes((p) => p.filter((x) => x.id !== id));
  }

  function aplicarTipoTodos(tipo: string) {
    setPendentes((p) => p.map((x) => ({ ...x, tipo })));
  }

  /**
   * Envia UM arquivo: faz upload no Storage via supabase-js (browser) e depois
   * chama a server action `registrarDocumento` para gravar o registro.
   */
  async function enviarUm(p: Pendente): Promise<void> {
    if (p.file.size > MAX_FILE_BYTES) {
      patchPendente(p.id, {
        status: "erro",
        erro: `Arquivo > ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB`,
      });
      throw new Error(`${p.file.name}: arquivo muito grande`);
    }

    patchPendente(p.id, { status: "enviando", erro: undefined });

    const supabase = createBrowserClient();
    const safeName = p.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${colaboradorId}/${p.tipo}/${Date.now()}_${p.id}_${safeName}`;

    // 1) upload direto no Storage (sem passar pelo Server Action — sem limite de body)
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, p.file, {
        contentType: p.file.type || "application/octet-stream",
        upsert: false,
      });
    if (upErr) {
      patchPendente(p.id, { status: "erro", erro: upErr.message });
      throw new Error(`${p.file.name}: ${upErr.message}`);
    }

    // 2) registra no DB via server action (mínimo payload)
    const res = await registrarDocumento({
      colaborador_id: colaboradorId,
      tipo: p.tipo,
      descricao: p.titulo.trim() || p.file.name,
      arquivo_url: path,
      dias_atestado:
        p.tipo === "atestado" && p.dias ? Number(p.dias) || null : null,
    });
    if (!res.ok) {
      patchPendente(p.id, { status: "erro", erro: res.error });
      throw new Error(`${p.file.name}: ${res.error}`);
    }

    patchPendente(p.id, { status: "ok" });
  }

  /**
   * Envia em pool de até N simultâneos. NÃO interrompe a fila quando algum
   * arquivo falha — coleta os erros e segue.
   */
  async function handleEnviar() {
    if (pendentes.length === 0) return;
    setUploading(true);

    // Trabalhar com a fila atual; reagimos a falhas/sucessos via status.
    const fila = pendentes.filter((p) => p.status !== "ok").slice();
    let ok = 0;
    let erro = 0;
    const mensagensErro: string[] = [];

    async function worker() {
      while (fila.length > 0) {
        const p = fila.shift();
        if (!p) return;
        try {
          await enviarUm(p);
          ok++;
        } catch (e) {
          erro++;
          mensagensErro.push((e as Error).message);
        }
      }
    }

    const workers = Array.from(
      { length: Math.min(UPLOAD_CONCURRENCY, fila.length) },
      () => worker(),
    );
    await Promise.all(workers);

    if (erro === 0) {
      toast.success(`${ok} documento(s) enviado(s)`);
      // Limpa apenas os enviados com sucesso (mantém erros pra retry)
      setPendentes((p) => p.filter((x) => x.status !== "ok"));
      router.refresh();
    } else {
      toast.error(`Enviados ${ok} de ${ok + erro}`, {
        description: mensagensErro.slice(0, 3).join("\n"),
      });
      // Mantém na fila apenas os com erro — sucessos saem
      setPendentes((p) => p.filter((x) => x.status === "erro" || x.status === "pendente"));
      router.refresh();
    }

    setUploading(false);
  }

  /** Reenviar apenas os que falharam. */
  async function handleReenviarErros() {
    const erros = pendentes.filter((p) => p.status === "erro");
    if (erros.length === 0) return;
    // Marca todos como pendentes pra entrar no fluxo
    setPendentes((p) =>
      p.map((x) =>
        x.status === "erro" ? { ...x, status: "pendente", erro: undefined } : x,
      ),
    );
    // Pequena espera pro React processar antes de re-enviar
    setTimeout(handleEnviar, 50);
  }

  async function handleDownload(doc: ColaboradorDocumento) {
    const url = await getDocumentoUrl(doc.arquivo_url);
    if (url) window.open(url, "_blank");
    else toast.error("Não foi possível gerar o link de download.");
  }

  function handleDelete(doc: ColaboradorDocumento) {
    if (!confirm(`Excluir o documento "${doc.descricao ?? "sem nome"}"?`)) return;
    startTransition(async () => {
      const res = await deleteDocumento(doc.id, doc.arquivo_url, colaboradorId);
      if (res.ok) {
        toast.success("Documento excluído");
        router.refresh();
      } else {
        toast.error("Erro ao excluir", { description: res.error });
      }
    });
  }

  const filtrados =
    filtro === "all" ? documentos : documentos.filter((d) => d.tipo === filtro);

  // Resumo de atestados (alerta INSS: 15+ dias em 60 dias)
  const atestados = documentos.filter(
    (d) => d.tipo === "atestado" && d.dias_atestado,
  );
  const totalDias = atestados.reduce((s, d) => s + (d.dias_atestado ?? 0), 0);
  const limite60 = new Date(agora - 60 * 24 * 60 * 60 * 1000);
  const dias60 = atestados
    .filter((d) => new Date(d.data_upload) >= limite60)
    .reduce((s, d) => s + (d.dias_atestado ?? 0), 0);

  const totalErros = pendentes.filter((p) => p.status === "erro").length;

  return (
    <div className="space-y-4">
      {totalDias > 0 && (
        <div
          className={cn(
            "p-3 rounded-lg border text-sm",
            dias60 >= 15 ? "border-rose-300 bg-rose-50" : "bg-muted/50",
          )}
        >
          Atestados: <strong>{totalDias} dias</strong> (total) ·{" "}
          <strong>{dias60} dias</strong> (últimos 60 dias)
          {dias60 >= 15 && (
            <Badge variant="secondary" className="ml-2 bg-rose-100 text-rose-700">
              Atenção INSS
            </Badge>
          )}
        </div>
      )}

      {!readOnly && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) =>
                  e.target.files &&
                  e.target.files.length > 0 &&
                  addFiles(e.target.files)
                }
              />
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="size-4" />
                Anexar arquivo(s)
              </Button>
              <span className="text-sm text-muted-foreground">
                {pendentes.length > 0
                  ? `${pendentes.length} arquivo(s) na fila — escolha o título de cada um e envie.`
                  : "Selecione um ou vários arquivos."}
              </span>

              {documentos.length > 0 && (
                <div className="ml-auto flex items-center gap-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                    Filtrar
                  </Label>
                  <select
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">Todos ({documentos.length})</option>
                    {TIPOS_DOCUMENTO.map((t) => {
                      const n = documentos.filter((d) => d.tipo === t.value).length;
                      return n > 0 ? (
                        <option key={t.value} value={t.value}>
                          {t.label} ({n})
                        </option>
                      ) : null;
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* Fila de envio — título por arquivo */}
            {pendentes.length > 0 && (
              <div className="rounded-lg border divide-y">
                <div className="flex flex-wrap items-center gap-2 p-2.5 bg-muted/40">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                    Definir tipo de todos
                  </Label>
                  <TipoSelect
                    value="outros"
                    onChange={aplicarTipoTodos}
                    disabled={uploading}
                  />
                  <div className="ml-auto flex items-center gap-2">
                    {totalErros > 0 && !uploading && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReenviarErros}
                        className="gap-2"
                      >
                        <AlertCircle className="size-4 text-rose-500" />
                        Reenviar erros ({totalErros})
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendentes([])}
                      disabled={uploading}
                    >
                      Limpar
                    </Button>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={handleEnviar}
                      disabled={
                        uploading || pendentes.every((p) => p.status === "ok")
                      }
                    >
                      {uploading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      {uploading
                        ? "Enviando…"
                        : `Enviar (${pendentes.filter((p) => p.status !== "ok").length})`}
                    </Button>
                  </div>
                </div>

                {pendentes.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      "flex flex-wrap items-center gap-2 p-2.5",
                      p.status === "erro" && "bg-rose-50/40",
                      p.status === "ok" && "bg-emerald-50/40",
                      p.status === "enviando" && "bg-sky-50/40",
                    )}
                  >
                    {/* Status icon */}
                    <div className="shrink-0">
                      {p.status === "enviando" ? (
                        <Loader2 className="size-4 animate-spin text-sky-500" />
                      ) : p.status === "ok" ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : p.status === "erro" ? (
                        <AlertCircle className="size-4 text-rose-500" />
                      ) : (
                        <FileText className="size-4 text-muted-foreground" />
                      )}
                    </div>

                    <Input
                      value={p.titulo}
                      onChange={(e) =>
                        patchPendente(p.id, { titulo: e.target.value })
                      }
                      placeholder="Título do documento"
                      title={`Arquivo: ${p.file.name} (${(p.file.size / 1024 / 1024).toFixed(2)} MB)`}
                      className="flex-1 min-w-[180px] h-9"
                      disabled={uploading}
                    />
                    <TipoSelect
                      value={p.tipo}
                      onChange={(v) => patchPendente(p.id, { tipo: v })}
                      disabled={uploading}
                    />
                    {p.tipo === "atestado" && (
                      <Input
                        type="number"
                        min="1"
                        value={p.dias}
                        onChange={(e) =>
                          patchPendente(p.id, { dias: e.target.value })
                        }
                        placeholder="Dias"
                        className="w-20"
                        disabled={uploading}
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removePendente(p.id)}
                      disabled={uploading}
                      aria-label="Remover da fila"
                    >
                      <X className="size-4" />
                    </Button>
                    {p.erro && (
                      <div className="w-full text-[11px] text-rose-700 pl-6">
                        {p.erro}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {filtrados.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <FileText className="size-8 opacity-40" />
              <p className="text-sm">Nenhum documento anexado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Arquivo</TableHead>
                  {filtrados.some((d) => d.dias_atestado) && (
                    <TableHead className="text-right">Dias</TableHead>
                  )}
                  <TableHead>Enviado em</TableHead>
                  <TableHead className="w-28 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="bg-muted text-muted-foreground"
                      >
                        {documentoTipoLabel(doc.tipo)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{doc.descricao ?? "—"}</TableCell>
                    {filtrados.some((d) => d.dias_atestado) && (
                      <TableCell className="text-right text-sm">
                        {doc.dias_atestado ?? "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateBR(doc.data_upload)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDownload(doc)}
                          aria-label="Baixar"
                        >
                          <Download className="size-3.5" />
                        </Button>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={isPending}
                            onClick={() => handleDelete(doc)}
                            aria-label="Excluir"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
