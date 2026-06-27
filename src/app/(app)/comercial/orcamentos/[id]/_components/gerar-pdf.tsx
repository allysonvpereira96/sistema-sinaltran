"use client";

import { useState } from "react";
import { FileDown, Files } from "lucide-react";
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

type Conteudo = "completo" | OrcamentoBlocoTipo;
type EmpresaKey = "sinaltran" | "sinalshop";

const CONTEUDO_LABEL: Record<Conteudo, string> = {
  completo: "Completo (mão de obra + material)",
  servicos: "Só mão de obra",
  produtos: "Só produtos",
  sinalshop: "Só tinta (Sinalshop)",
};

const ORDEM: OrcamentoBlocoTipo[] = ["servicos", "produtos", "sinalshop"];

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
  const temBlocos = tipos.length > 0;
  const opcoes: Conteudo[] = ["completo", ...ORDEM.filter((t) => tipos.includes(t))];

  const [conteudo, setConteudo] = useState<Conteudo>("completo");
  const [empresa, setEmpresa] = useState<EmpresaKey>("sinaltran");

  const base = `/comercial/orcamentos/${orcamentoId}/pdf`;

  function trocarConteudo(c: Conteudo) {
    setConteudo(c);
    // Default inteligente: tinta sai no nome da Sinalshop; demais, Sinaltran.
    setEmpresa(c === "sinalshop" ? "sinalshop" : "sinaltran");
  }

  function gerar() {
    window.open(`${base}?conteudo=${conteudo}&empresa=${empresa}`, "_blank", "noopener");
  }
  function gerarSeparados() {
    window.open(`${base}?separados=1`, "_blank", "noopener");
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
              onChange={(e) => trocarConteudo(e.target.value as Conteudo)}
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

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {temBlocos ? (
            <Button variant="outline" className="gap-2" onClick={gerarSeparados}>
              <Files className="size-4" />
              Gerar separados ({tipos.length})
            </Button>
          ) : null}
          <Button className="gap-2" onClick={gerar}>
            <FileDown className="size-4" />
            Gerar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
