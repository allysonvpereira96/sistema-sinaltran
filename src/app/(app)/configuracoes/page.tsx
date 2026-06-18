import Link from "next/link";
import { UserCog, Building2, Plug, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ConfigCard = {
  title: string;
  description: string;
  icon: typeof UserCog;
  href?: string;
};

const cards: ConfigCard[] = [
  {
    title: "Usuários e acessos",
    description:
      "Cadastre usuários, defina quem é master e selecione os módulos de cada um.",
    icon: UserCog,
    href: "/configuracoes/usuarios",
  },
  {
    title: "Parâmetros",
    description:
      "Valores configuráveis do sistema, como o salário mínimo usado no cálculo da insalubridade.",
    icon: SlidersHorizontal,
    href: "/configuracoes/parametros",
  },
  {
    title: "Dados da empresa",
    description: "Razão social, CNPJ e parâmetros das empresas emissoras.",
    icon: Building2,
  },
  {
    title: "Integrações",
    description: "Supabase, e-mail e NF-e.",
    icon: Plug,
  },
  {
    title: "Auditoria",
    description: "Trilhas de acesso e histórico de alterações.",
    icon: ShieldCheck,
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="p-6 lg:p-8 max-w-[1100px] mx-auto space-y-6">
      <PageHeader
        title="Configurações"
        description="Parâmetros do sistema, usuários, perfis de acesso e integrações."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          const disabled = !card.href;
          const content = (
            <Card
              className={cn(
                "h-full transition-colors",
                disabled
                  ? "opacity-60"
                  : "hover:border-primary/50 hover:bg-muted/40",
              )}
            >
              <CardContent className="flex items-start gap-4 p-5">
                <div className="size-10 shrink-0 rounded-md bg-primary/10 text-primary grid place-items-center">
                  <Icon className="size-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{card.title}</h3>
                    {disabled ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Em breve
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );

          return card.href ? (
            <Link key={card.title} href={card.href} className="block">
              {content}
            </Link>
          ) : (
            <div key={card.title}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
