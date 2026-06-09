"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      toast.error("Supabase ainda não foi configurado.", {
        description:
          "Conecte o projeto ao Supabase e preencha o .env.local antes de tentar entrar.",
      });
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Não foi possível entrar", { description: error.message });
        return;
      }

      toast.success("Bem-vindo!");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar no sistema</CardTitle>
        <CardDescription>
          Use suas credenciais corporativas para acessar o painel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.nome@sinaltran.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
