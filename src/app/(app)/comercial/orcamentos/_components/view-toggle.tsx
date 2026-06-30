import Link from "next/link";
import { List, KanbanSquare } from "lucide-react";
import { cn } from "@/lib/utils";

/** Alternador de visualização: Lista ⇄ Kanban (funil). */
export function ViewToggle({ active }: { active: "lista" | "kanban" }) {
  const base =
    "inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-sm font-medium transition-colors";
  const on = "bg-background text-foreground shadow-sm";
  const off = "text-muted-foreground hover:text-foreground";
  return (
    <div className="inline-flex items-center rounded-md border bg-muted/50 p-0.5">
      <Link
        href="/comercial/orcamentos"
        className={cn(base, active === "lista" ? on : off)}
        aria-current={active === "lista" ? "page" : undefined}
      >
        <List className="size-4" />
        Lista
      </Link>
      <Link
        href="/comercial/orcamentos/funil"
        className={cn(base, active === "kanban" ? on : off)}
        aria-current={active === "kanban" ? "page" : undefined}
      >
        <KanbanSquare className="size-4" />
        Kanban
      </Link>
    </div>
  );
}
