"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { salvarParametros, type Parametro } from "@/lib/actions/parametros";
import { cn } from "@/lib/utils";

export function ParametrosForm({ parametros }: { parametros: Parametro[] }) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, string>>(
    () => Object.fromEntries(parametros.map((p) => [p.chave, p.valor])),
  );
  const [salvando, setSalvando] = useState(false);

  // agrupa por "grupo" para exibir em seções
  const grupos = Array.from(new Set(parametros.map((p) => p.grupo ?? "Geral")));

  async function salvar() {
    setSalvando(true);
    try {
      const updates = parametros
        .filter((p) => valores[p.chave] !== p.valor)
        .map((p) => ({ chave: p.chave, valor: valores[p.chave] ?? "" }));
      if (updates.length === 0) {
        toast.info("Nenhuma alteração para salvar.");
        return;
      }
      const res = await salvarParametros(updates);
      if (!res.ok) {
        toast.error("Erro ao salvar", { description: res.error });
        return;
      }
      toast.success("Parâmetros atualizados.");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-[800px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/configuracoes"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <PageHeader
            title="Parâmetros"
            description="Valores configuráveis do sistema — alterar aqui reflete nos cálculos."
          />
        </div>
        <Button onClick={salvar} disabled={salvando} className="gap-2">
          {salvando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar
        </Button>
      </div>

      {grupos.map((grupo) => (
        <Card key={grupo}>
          <CardHeader>
            <CardTitle>{grupo}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {parametros
              .filter((p) => (p.grupo ?? "Geral") === grupo)
              .map((p) => (
                <div key={p.chave} className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                    {p.descricao ?? p.chave}
                  </Label>
                  <Input
                    value={valores[p.chave] ?? ""}
                    onChange={(e) => setValores((v) => ({ ...v, [p.chave]: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground font-mono">{p.chave}</p>
                </div>
              ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
