import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex-1 grid place-items-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <Link href="/" className="flex items-center gap-2 justify-center">
          <div className="size-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">
            S
          </div>
          <span className="font-semibold tracking-tight">Sinaltran</span>
        </Link>
        <LoginForm />
        <p className="text-center text-xs text-muted-foreground">
          Acesso restrito a colaboradores autorizados.
        </p>
      </div>
    </main>
  );
}
