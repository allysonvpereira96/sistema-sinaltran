"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ColaboradorComentario } from "@/lib/mocks/colaboradores";
import { createComentario, deleteComentario } from "@/lib/actions/colaboradores";
import { formatDateBR } from "@/lib/format";

export function ComentariosTab({
  colaboradorId,
  comentarios,
}: {
  colaboradorId: string;
  comentarios: ColaboradorComentario[];
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleAdd() {
    if (!texto.trim()) return;
    setSaving(true);
    const res = await createComentario(colaboradorId, texto);
    setSaving(false);
    if (res.ok) {
      setTexto("");
      router.refresh();
    } else {
      toast.error("Erro ao comentar", { description: res.error });
    }
  }

  function handleDelete(c: ColaboradorComentario) {
    if (!confirm("Excluir este comentário?")) return;
    startTransition(async () => {
      const res = await deleteComentario(c.id, colaboradorId);
      if (res.ok) router.refresh();
      else toast.error("Erro ao excluir", { description: res.error });
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <Textarea
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva um comentário interno sobre o colaborador…"
          />
          <div className="flex justify-end">
            <Button className="gap-2" disabled={saving || !texto.trim()} onClick={handleAdd}>
              <Send className="size-4" />
              {saving ? "Enviando…" : "Comentar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {comentarios.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessageSquare className="size-8 opacity-40" />
            <p className="text-sm">Nenhum comentário ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {comentarios.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm whitespace-pre-wrap break-words">{c.comentario}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">{formatDateBR(c.created_at)}</p>
                </div>
                <Button variant="ghost" size="icon-sm" disabled={isPending} onClick={() => handleDelete(c)} aria-label="Excluir">
                  <Trash2 className="size-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
