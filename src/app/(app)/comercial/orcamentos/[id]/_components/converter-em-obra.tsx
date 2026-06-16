"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HardHat } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { converterOrcamentoEmObra } from "@/lib/actions/obras";

export function ConverterEmObraButton({
  orcamentoId,
}: {
  orcamentoId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConvert() {
    startTransition(async () => {
      const res = await converterOrcamentoEmObra(orcamentoId);
      if (!res.ok) {
        toast.error("Não foi possível converter", { description: res.error });
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
        Converter em obra
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground hidden sm:inline">
        Confirmar conversão?
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
        {pending ? "Convertendo…" : "Sim, converter"}
      </Button>
    </div>
  );
}
