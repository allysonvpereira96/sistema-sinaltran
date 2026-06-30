"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { marcarRecebida } from "@/lib/actions/medicoes";
import type { FormaRecebimento } from "@/lib/types/medicao";
import { BaixaDialog } from "../../_components/baixa-dialog";

export function ReceberButton({
  medicaoId,
  recebida,
  valorTotal,
  formaPadrao,
}: {
  medicaoId: string;
  recebida: boolean;
  valorTotal: number;
  formaPadrao?: FormaRecebimento | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function desfazer() {
    startTransition(async () => {
      const res = await marcarRecebida(medicaoId, false);
      if (!res.ok) {
        toast.error("Erro", { description: res.error });
        return;
      }
      toast.success("Baixa desfeita");
      router.refresh();
    });
  }

  if (recebida) {
    return (
      <Button type="button" variant="outline" onClick={desfazer} disabled={pending} className="gap-2">
        <Undo2 className="size-4" />
        {pending ? "Salvando…" : "Desfazer recebimento"}
      </Button>
    );
  }

  return (
    <BaixaDialog
      medicaoId={medicaoId}
      valorTotal={valorTotal}
      formaPadrao={formaPadrao}
      trigger={
        <Button type="button" className="gap-2">
          <BadgeCheck className="size-4" />
          Marcar como recebida
        </Button>
      }
    />
  );
}
