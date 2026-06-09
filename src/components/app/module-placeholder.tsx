import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  bullets?: string[];
};

export function ModulePlaceholder({
  title,
  description,
  icon: Icon = Construction,
  bullets,
}: ModulePlaceholderProps) {
  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
      </header>

      <Card>
        <CardContent className="p-10 grid place-items-center text-center">
          <div className="size-14 rounded-2xl bg-primary/15 text-primary grid place-items-center mb-4">
            <Icon className="size-7" />
          </div>
          <div className="font-semibold text-lg">Módulo em construção</div>
          <p className="text-sm text-muted-foreground max-w-md mt-1">
            Este módulo está mapeado no escopo do projeto e será desenvolvido
            nas próximas sprints, conforme o cronograma com a Pleno Business.
          </p>

          {bullets && bullets.length > 0 ? (
            <ul className="mt-6 grid sm:grid-cols-2 gap-2 text-sm text-left max-w-xl w-full">
              {bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2 bg-muted/60 rounded-md px-3 py-2"
                >
                  <span className="size-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <span className="text-foreground/80">{b}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
