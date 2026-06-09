import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  let userEmail: string | null = null;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  }

  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">
              S
            </div>
            <span className="font-semibold tracking-tight">
              Sinaltran · Painel
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {userEmail ? (
              <span className="hidden sm:inline">{userEmail}</span>
            ) : (
              <span className="hidden sm:inline">
                Supabase não configurado
              </span>
            )}
            <Link
              href="/"
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Início
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Bem-vindo ao painel
          </h1>
          <p className="text-muted-foreground">
            Esta é a estrutura inicial do sistema. Os módulos serão adicionados
            conforme avançarmos.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Operações</CardTitle>
              <CardDescription>
                Controle das atividades de campo e fiscalização.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Administrativo</CardTitle>
              <CardDescription>
                Usuários, perfis de acesso e configurações gerais.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Relatórios</CardTitle>
              <CardDescription>
                Indicadores e exportações para acompanhamento gerencial.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    </main>
  );
}
