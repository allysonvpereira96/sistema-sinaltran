"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { marcarRecebida } from "@/lib/actions/medicoes";

export function ReceberButton({
  medicaoId,
  recebida,
}: {
  medicaoId: string;
  recebida: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await marcarRecebida(medicaoId, !recebida);
      if (!res.ok) {
        toast.error("Erro", { description: res.error });
        return;
      }
      toast.success(recebida ? "Baixa desfeita" : "Recebimento registrado");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant={recebida ? "outline" : "default"}
      onClick={toggle}
      disabled={pending}
      className="gap-2"
    >
      {recebida ? <Undo2 className="size-4" /> : <BadgeCheck className="size-4" />}
      {pending
        ? "Salvando…"
        : recebida
          ? "Desfazer recebimento"
          : "Marcar como recebida"}
    </Button>
  );
}
