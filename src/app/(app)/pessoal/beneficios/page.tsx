import Link from "next/link";
import { ShoppingBasket, UtensilsCrossed, Fuel } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Benefícios · Departamento Pessoal" };

const cards = [
  { titulo: "Cesta básica", desc: "Quem recebe a cesta no mês; perde por falta/atestado.", icon: ShoppingBasket, href: "/pessoal/beneficios/cesta" },
  { titulo: "Vale-refeição (VR)", desc: "Alimentação semanal, extras e descontos.", icon: UtensilsCrossed, href: "/pessoal/beneficios/vale-refeicao" },
  { titulo: "Combustível", desc: "Dias úteis × valor/dia, com descontos.", icon: Fuel, href: "/pessoal/beneficios/combustivel" },
];

export default function BeneficiosPage() {
  return (
    <div className="p-6 lg:p-8 max-w-[1100px] mx-auto space-y-6">
      <PageHeader title="Benefícios" description="Controle mensal de cesta básica, vale-refeição e combustível, com recibo para assinar." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const disabled = !c.href;
          const inner = (
            <Card className={cn("h-full transition-colors", disabled ? "opacity-60" : "hover:border-primary/50 hover:bg-muted/40")}>
              <CardContent className="flex items-start gap-4 p-5">
                <div className="size-10 shrink-0 rounded-md bg-primary/10 text-primary grid place-items-center"><Icon className="size-5" /></div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{c.titulo}</h3>
                    {disabled ? <Badge variant="secondary" className="text-[10px]">Em breve</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{c.desc}</p>
                </div>
              </CardContent>
            </Card>
          );
          return c.href ? <Link key={c.titulo} href={c.href} className="block">{inner}</Link> : <div key={c.titulo}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
