"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HardHat } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
      await new Promise((r) => setTimeout(r, 500));
      toast.success("Obra criada a partir do orçamento", {
        description:
          "Quando o Supabase estiver conectado, o orçamento será marcado como 'aprovado' e uma nova obra será inserida com os mesmos dados.",
      });
      // Em produção: redirecionar para /obras/<nova-id>/editar
      router.push("/obras");
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
      <Button
        size="sm"
        onClick={handleConvert}
        disabled={pending}
        className="gap-2"
      >
        <HardHat className="size-4" />
        {pending ? "Convertendo…" : "Sim, converter"}
      </Button>
    </div>
  );
}
