"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Files, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setEmiteNotaUnica } from "@/lib/actions/orcamentos";

export function NfRegimeToggle({
  orcamentoId,
  notaUnica,
}: {
  orcamentoId: string;
  notaUnica: boolean;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(notaUnica);
  const [pending, startTransition] = useTransition();

  function alterar(novo: boolean) {
    if (novo === valor || pending) return;
    setValor(novo); // otimista
    startTransition(async () => {
      const res = await setEmiteNotaUnica(orcamentoId, novo);
      if (res.ok) {
        toast.success(
          novo
            ? "Emissão como NFS única (material como serviço)"
            : "Emissão em 2 notas (NFS + NF)",
        );
        router.refresh();
      } else {
        setValor(!novo); // reverte
        toast.error("Erro ao alterar", { description: res.error });
      }
    });
  }

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Emissão fiscal (Omie)
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant={valor ? "outline" : "default"}
          size="sm"
          className="gap-2 justify-start"
          disabled={pending}
          onClick={() => alterar(false)}
        >
          <Files className="size-4" />
          2 notas (NFS + NF)
        </Button>
        <Button
          type="button"
          variant={valor ? "default" : "outline"}
          size="sm"
          className="gap-2 justify-start"
          disabled={pending}
          onClick={() => alterar(true)}
        >
          <FileText className="size-4" />
          NFS única (material como serviço)
        </Button>
      </div>
      <p className={cn("text-[11px] text-muted-foreground mt-2")}>
        {valor
          ? "O export pro Omie sai como uma única Ordem de Serviço, com o material lançado como serviço."
          : "O export pro Omie sai separado: Ordem de Serviço + Pedido(s) de Venda."}
      </p>
    </div>
  );
}
