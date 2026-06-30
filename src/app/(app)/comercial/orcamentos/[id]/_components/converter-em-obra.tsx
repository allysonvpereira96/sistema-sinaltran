"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HardHat } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { converterOrcamentoEmObra } from "@/lib/actions/obras";

export function ConverterEmObraButton({
  orcamentoId,
  aprovado = false,
}: {
  orcamentoId: string;
  /** Se o orçamento já está aprovado, o botão só "converte"; senão, aprova e gera. */
  aprovado?: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const label = aprovado ? "Converter em obra" : "Aprovar e gerar obra";

  function handleConvert() {
    startTransition(async () => {
      const res = await converterOrcamentoEmObra(orcamentoId);
      if (!res.ok) {
        toast.error("Não foi possível gerar a obra", { description: res.error });
        return;
      }
      toast.success("Obra criada a partir do orçamento", {
        description: "O orçamento foi marcado como aprovado e vinculado à obra.",
      });
      router.push(`/obras/${res.obraId}`);
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <Button onClick={() => setConfirming(true)} className="gap-2">
        <HardHat className="size-4" />
        {label}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {aprovado ? "Confirmar conversão?" : "Aprovar e gerar a obra?"}
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setConfirming(false)}
        disabled={pending}
      >
        Cancelar
      </Button>
      <Button size="sm" onClick={handleConvert} disabled={pending} className="gap-2">
        <HardHat className="size-4" />
        {pending ? "Gerando…" : aprovado ? "Sim, converter" : "Sim, aprovar e gerar"}
      </Button>
    </div>
  );
}
