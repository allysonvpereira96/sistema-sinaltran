"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { LogOut } from "lucide-react";
import { navigation } from "@/config/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { CurrentProfile } from "@/lib/types/usuario";

function isActive(currentPath: string, itemHref: string) {
  if (itemHref === "/dashboard") return currentPath === "/dashboard";
  if (itemHref === "/obras") {
    return (
      currentPath === "/obras" &&
      !currentPath.startsWith("/obras/planejamento") &&
      !currentPath.startsWith("/obras/relatorios")
    );
  }
  if (itemHref === "/producao") {
    return (
      currentPath === "/producao" &&
      !currentPath.startsWith("/producao/compras") &&
      !currentPath.startsWith("/producao/almoxarifado")
    );
  }
  return currentPath === itemHref || currentPath.startsWith(`${itemHref}/`);
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function AppSidebar({ profile }: { profile: CurrentProfile | null }) {
  const pathname = usePathname();
  const router = useRouter();

  const isAdmin = profile?.role === "admin";

  // Filtra seções/itens conforme acesso. Admin vê tudo; seções sem `key`
  // (Operação/Dashboard) são sempre visíveis.
  const sections = useMemo(() => {
    const modulos = profile?.modulos ?? [];
    return navigation
      .filter((section) => {
        if (!section.key) return true;
        if (isAdmin) return true;
        return modulos.includes(section.key);
      })
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.adminOnly || isAdmin),
      }))
      .filter((section) => section.items.length > 0);
  }, [isAdmin, profile?.modulos]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="size-10 rounded-md bg-primary text-primary-foreground grid place-items-center font-extrabold text-lg">
            S
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold text-white tracking-tight">
              Sinaltran
            </div>
            <div className="text-[10px] tracking-[0.18em] uppercase text-sidebar-foreground/60">
              Gestão de obras
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="px-3 mb-2 text-[10px] tracking-[0.18em] uppercase font-bold text-sidebar-foreground/45">
              {section.title}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-white",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge ? (
                        <span
                          className={cn(
                            "text-[10px] font-semibold rounded px-1.5 py-0.5",
                            active
                              ? "bg-primary-foreground/15 text-primary-foreground"
                              : "bg-sidebar-accent text-sidebar-foreground/80",
                          )}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-sidebar-accent transition-colors"
              />
            }
          >
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {profile ? iniciais(profile.nome) : "S"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 leading-tight min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                {profile?.nome ?? "Sinaltran"}
              </div>
              <div className="text-[11px] text-sidebar-foreground/55 truncate">
                {profile?.email ?? "Sistema interno"}
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
