"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setEmpresaAtivaAction, type Empresa } from "@/lib/actions/empresas";
import { cn } from "@/lib/utils";

/** Seletor global de empresa ativa (Sinaltran / Sinalshop) na topbar. */
export function EmpresaSwitcher({
  empresas,
  ativaId,
}: {
  empresas: Empresa[];
  ativaId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (empresas.length === 0) return null;
  const ativa = empresas.find((e) => e.id === ativaId) ?? empresas[0];

  function trocar(id: string) {
    if (id === ativa.id) return;
    startTransition(async () => {
      await setEmpresaAtivaAction(id);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            disabled={pending}
            className={cn(
              "flex items-center gap-2 h-9 rounded-md border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted transition-colors",
              pending && "opacity-60",
            )}
          />
        }
      >
        <Building2 className="size-4 text-muted-foreground" />
        <span className="hidden sm:inline">{ativa.nome}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Empresa ativa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {empresas.map((e) => (
          <DropdownMenuItem key={e.id} onClick={() => trocar(e.id)} className="gap-2">
            <Check
              className={cn("size-4", e.id === ativa.id ? "opacity-100" : "opacity-0")}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{e.nome}</div>
              <div className="text-xs text-muted-foreground truncate">{e.razao_social}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
