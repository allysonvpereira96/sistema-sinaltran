"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { navigation } from "@/config/navigation";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./theme-toggle";
import { EmpresaSwitcher } from "./empresa-switcher";
import type { CurrentProfile } from "@/lib/types/usuario";
import type { Empresa } from "@/lib/actions/empresas";

function findCrumbs(pathname: string) {
  for (const section of navigation) {
    for (const item of section.items) {
      if (
        pathname === item.href ||
        pathname.startsWith(`${item.href}/`)
      ) {
        return { section: section.title, page: item.label };
      }
    }
  }
  return { section: "Operação", page: "" };
}

export function AppTopbar({
  profile,
  empresas = [],
  empresaAtivaId = null,
}: {
  profile?: CurrentProfile | null;
  empresas?: Empresa[];
  empresaAtivaId?: string | null;
}) {
  const pathname = usePathname();
  const crumbs = findCrumbs(pathname);

  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur sticky top-0 z-20 print:hidden">
      <div className="h-full flex items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-4 min-w-0">
          <EmpresaSwitcher empresas={empresas} ativaId={empresaAtivaId} />
          <div className="text-sm text-muted-foreground truncate">
            <span className="font-medium text-foreground/80">{crumbs.section}</span>
            {crumbs.page ? (
              <>
                <span className="mx-2 text-muted-foreground/50">/</span>
                <span className="text-foreground font-semibold">{crumbs.page}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 h-9 w-72 rounded-md border bg-card px-3 text-sm text-muted-foreground">
            <Search className="size-4 shrink-0" />
            <input
              placeholder="Buscar obra, orçamento ou colaborador…"
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70 text-foreground"
            />
          </div>
          {profile?.role === "admin" ? (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Master
            </Badge>
          ) : null}
          <ThemeToggle />
          <button
            type="button"
            className="size-9 grid place-items-center rounded-md border bg-card text-foreground hover:bg-muted transition-colors"
            aria-label="Notificações"
          >
            <Bell className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
