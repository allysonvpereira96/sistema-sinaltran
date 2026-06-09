import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">
              S
            </div>
            <span className="font-semibold tracking-tight">Sinaltran</span>
          </div>
          <Link href="/login" className={buttonVariants({ size: "sm" })}>
            Entrar
          </Link>
        </div>
      </header>

      <section className="flex-1 grid place-items-center px-6 py-16">
        <div className="max-w-2xl text-center space-y-6">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
            Sistema interno · v0.1
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Plataforma de gestão da Sinaltran
          </h1>
          <p className="text-muted-foreground text-lg">
            Operação, fiscalização e administração centralizadas em um único
            sistema. Acesse com sua conta corporativa para começar.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/login" className={buttonVariants({ size: "lg" })}>
              Acessar sistema
            </Link>
            <Link
              href="/dashboard"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Ir para o painel
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Sinaltran</span>
          <span>Next.js + Supabase</span>
        </div>
      </footer>
    </main>
  );
}
