"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Files } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setEmiteNotaUnica } from "@/lib/actions/orcamentos";

/** Toggle compacto (ícone) do regime de emissão — usado na lista. */
export function NfRegimeMini({
  orcamentoId,
  notaUnica,
}: {
  orcamentoId: string;
  notaUnica: boolean;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(notaUnica);
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (pending) return;
    const novo = !valor;
    setValor(novo); // otimista
    startTransition(async () => {
      const res = await setEmiteNotaUnica(orcamentoId, novo);
      if (res.ok) {
        toast.success(novo ? "NFS única (material como serviço)" : "2 notas (NFS + NF)");
        router.refresh();
      } else {
        setValor(!novo);
        toast.error("Erro ao alterar", { description: res.error });
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={toggle}
      aria-label="Alternar emissão fiscal"
      title={
        valor
          ? "NFS única (material como serviço) — clique p/ 2 notas"
          : "2 notas (NFS + NF) — clique p/ NFS única"
      }
    >
      {valor ? (
        <FileText className="size-3.5 text-primary" />
      ) : (
        <Files className="size-3.5" />
      )}
    </Button>
  );
}
