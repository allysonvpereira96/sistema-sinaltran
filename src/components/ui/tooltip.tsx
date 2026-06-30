"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";

/**
 * Tooltip simples e ergonômico sobre o Base UI.
 * Uso: <Tooltip content="texto"><Button>…</Button></Tooltip>
 * O filho vira o gatilho (merge de props via render prop).
 */
function Tooltip({
  content,
  children,
  side = "top",
  sideOffset = 6,
  delay = 200,
  className,
}: {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  delay?: number;
  className?: string;
}) {
  if (content == null || content === "") return children;
  return (
    <TooltipPrimitive.Provider delay={delay}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger render={children} />
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
            <TooltipPrimitive.Popup
              className={cn(
                "z-50 max-w-xs rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md ring-1 ring-foreground/10 select-none",
                "origin-(--transform-origin) duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                className,
              )}
            >
              {content}
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export { Tooltip };
