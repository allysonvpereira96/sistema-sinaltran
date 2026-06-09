"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation } from "@/config/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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

export function AppSidebar() {
  const pathname = usePathname();

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
        {navigation.map((section) => (
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

      <div className="px-4 py-4 border-t border-sidebar-border flex items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
            S
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 leading-tight min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            Sinaltran
          </div>
          <div className="text-[11px] text-sidebar-foreground/55">
            Sistema interno
          </div>
        </div>
      </div>
    </aside>
  );
}
