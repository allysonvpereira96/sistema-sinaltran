"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { OrcamentoBlocoTipo } from "@/lib/types/orcamento";

type Conteudo = "completo" | "servicos" | "material";
type EmpresaKey = "sinaltran" | "sinalshop";

const CONTEUDO_LABEL: Record<Conteudo, string> = {
  completo: "Completo (mão de obra + material)",
  servicos: "Só mão de obra",
  material: "Só material",
};

const selectCls =
  "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function GerarPdfButton({
  orcamentoId,
  tipos,
  iconOnly = false,
}: {
  orcamentoId: string;
  /** Tipos de bloco presentes no orçamento (para montar as opções). */
  tipos: OrcamentoBlocoTipo[];
  /** Trigger compacto (só ícone) — usado na lista. */
  iconOnly?: boolean;
}) {
  const temMaterial = tipos.includes("produtos") || tipos.includes("sinalshop");
  const temServicos = tipos.includes("servicos");
  const opcoes: Conteudo[] = [
    "completo",
    ...(temServicos ? (["servicos"] as const) : []),
    ...(temMaterial ? (["material"] as const) : []),
  ];

  const [conteudo, setConteudo] = useState<Conteudo>("completo");
  const [empresa, setEmpresa] = useState<EmpresaKey>("sinaltran");

  const base = `/comercial/orcamentos/${orcamentoId}/pdf`;

  function gerar() {
    window.open(`${base}?conteudo=${conteudo}&empresa=${empresa}`, "_blank", "noopener");
  }

  return (
    <Dialog>
      {iconOnly ? (
        <DialogTrigger
          render={<Button variant="ghost" size="icon-sm" />}
          aria-label="Gerar PDF"
        >
          <FileDown className="size-3.5" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
          <FileDown className="size-4" />
          Gerar PDF
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar PDF do orçamento</DialogTitle>
          <DialogDescription>
            Escolha o que incluir e em nome de qual empresa o orçamento sai.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Conteúdo</label>
            <select
              className={selectCls}
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value as Conteudo)}
            >
              {opcoes.map((c) => (
                <option key={c} value={c}>
                  {CONTEUDO_LABEL[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Emitir em nome de
            </label>
            <select
              className={selectCls}
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value as EmpresaKey)}
            >
              <option value="sinaltran">Sinaltran</option>
              <option value="sinalshop">Sinalshop</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button className="gap-2" onClick={gerar}>
            <FileDown className="size-4" />
            Gerar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
