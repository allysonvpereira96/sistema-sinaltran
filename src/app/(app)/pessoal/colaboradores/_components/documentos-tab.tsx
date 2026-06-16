"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Download, Trash2 } from "lucide-react";
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
  const [tipo, setTipo] = useState("outros");
  const [diasAtestado, setDiasAtestado] = useState("");
  const [filtro, setFiltro] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  // capturado uma vez (inicializador lazy = pode ser impuro)
  const [agora] = useState(() => Date.now());

  async function handleFiles(files: FileList) {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.set("colaborador_id", colaboradorId);
        fd.set("tipo", tipo);
        if (tipo === "atestado" && diasAtestado) fd.set("dias_atestado", diasAtestado);
        fd.set("file", file);
        const res = await uploadDocumento(fd);
        if (!res.ok) throw new Error(res.error);
      }
      toast.success(`${files.length} documento(s) enviado(s)`);
      setDiasAtestado("");
      router.refresh();
    } catch (e) {
      toast.error("Erro ao enviar", { description: (e as Error).message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
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
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[180px]">
            <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Tipo de documento</Label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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
          </div>
          {tipo === "atestado" && (
            <div className="w-28">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Dias</Label>
              <Input
                type="number"
                min="1"
                value={diasAtestado}
                onChange={(e) => setDiasAtestado(e.target.value)}
                className="mt-1.5"
                placeholder="Dias"
              />
            </div>
          )}
          <div>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && e.target.files.length > 0 && handleFiles(e.target.files)}
            />
            <Button type="button" variant="outline" className="gap-2" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              {uploading ? "Enviando…" : "Anexar arquivo(s)"}
            </Button>
          </div>

          {documentos.length > 0 && (
            <div className="ml-auto">
              <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Filtrar</Label>
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="mt-1.5 h-9 rounded-md border border-input bg-background px-3 text-sm"
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
