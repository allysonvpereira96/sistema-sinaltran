"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Download, Trash2, X, Send } from "lucide-react";
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
  uploadDocumento,
  deleteDocumento,
  getDocumentoUrl,
} from "@/lib/actions/colaboradores";
import { formatDateBR } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Arquivo na fila de envio, com seu próprio título/tipo. */
type Pendente = { id: number; file: File; tipo: string; dias: string };

/** Select de tipo de documento reaproveitado (com optgroups). */
function TipoSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("h-9 rounded-md border border-input bg-background px-3 text-sm", className)}
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
      tipo: "outros",
      dias: "",
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

  async function handleEnviar() {
    if (pendentes.length === 0) return;
    setUploading(true);
    let enviados = 0;
    try {
      for (const p of pendentes) {
        const fd = new FormData();
        fd.set("colaborador_id", colaboradorId);
        fd.set("tipo", p.tipo);
        if (p.tipo === "atestado" && p.dias) fd.set("dias_atestado", p.dias);
        fd.set("file", p.file);
        const res = await uploadDocumento(fd);
        if (!res.ok) throw new Error(`${p.file.name}: ${res.error}`);
        enviados++;
      }
      toast.success(`${enviados} documento(s) enviado(s)`);
      setPendentes([]);
      router.refresh();
    } catch (e) {
      toast.error(`Enviados ${enviados} de ${pendentes.length}`, { description: (e as Error).message });
      router.refresh();
    } finally {
      setUploading(false);
    }
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

  const filtrados = filtro === "all" ? documentos : documentos.filter((d) => d.tipo === filtro);

  // Resumo de atestados (alerta INSS: 15+ dias em 60 dias)
  const atestados = documentos.filter((d) => d.tipo === "atestado" && d.dias_atestado);
  const totalDias = atestados.reduce((s, d) => s + (d.dias_atestado ?? 0), 0);
  const limite60 = new Date(agora - 60 * 24 * 60 * 60 * 1000);
  const dias60 = atestados
    .filter((d) => new Date(d.data_upload) >= limite60)
    .reduce((s, d) => s + (d.dias_atestado ?? 0), 0);

  return (
    <div className="space-y-4">
      {totalDias > 0 && (
        <div className={cn("p-3 rounded-lg border text-sm", dias60 >= 15 ? "border-rose-300 bg-rose-50" : "bg-muted/50")}>
          Atestados: <strong>{totalDias} dias</strong> (total) · <strong>{dias60} dias</strong> (últimos 60 dias)
          {dias60 >= 15 && <Badge variant="secondary" className="ml-2 bg-rose-100 text-rose-700">Atenção INSS</Badge>}
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
                onChange={(e) => e.target.files && e.target.files.length > 0 && addFiles(e.target.files)}
              />
              <Button type="button" variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
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
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Filtrar</Label>
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
                <div className="flex items-center gap-2 p-2.5 bg-muted/40">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                    Definir título de todos
                  </Label>
                  <TipoSelect value="outros" onChange={aplicarTipoTodos} />
                  <div className="ml-auto flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setPendentes([])} disabled={uploading}>
                      Limpar
                    </Button>
                    <Button size="sm" className="gap-2" onClick={handleEnviar} disabled={uploading}>
                      <Send className="size-4" />
                      {uploading ? "Enviando…" : `Enviar (${pendentes.length})`}
                    </Button>
                  </div>
                </div>

                {pendentes.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 p-2.5">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[240px]" title={p.file.name}>
                      {p.file.name}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <TipoSelect value={p.tipo} onChange={(v) => patchPendente(p.id, { tipo: v })} />
                      {p.tipo === "atestado" && (
                        <Input
                          type="number"
                          min="1"
                          value={p.dias}
                          onChange={(e) => patchPendente(p.id, { dias: e.target.value })}
                          placeholder="Dias"
                          className="w-20"
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
                    </div>
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
                  {filtrados.some((d) => d.dias_atestado) && <TableHead className="text-right">Dias</TableHead>}
                  <TableHead>Enviado em</TableHead>
                  <TableHead className="w-28 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">
                        {documentoTipoLabel(doc.tipo)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{doc.descricao ?? "—"}</TableCell>
                    {filtrados.some((d) => d.dias_atestado) && (
                      <TableCell className="text-right text-sm">{doc.dias_atestado ?? "—"}</TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground">{formatDateBR(doc.data_upload)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDownload(doc)} aria-label="Baixar">
                          <Download className="size-3.5" />
                        </Button>
                        {!readOnly && (
                          <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => handleDelete(doc)} aria-label="Excluir">
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
