import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Chave de service role (admin) do Supabase. Em prod (Vercel) e no .env.local
 * ela aparece como `SUPABASE_SERVICE_ROLE_KEY` e/ou `SUPABASE_SECRET_KEY`.
 * NUNCA é exposta ao client (sem prefixo NEXT_PUBLIC_).
 */
function serviceKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  );
}

/** Indica se dá pra usar a Admin API (criar usuário, redefinir senha, banir). */
export function hasAdminKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && serviceKey());
}

/**
 * Client com privilégios de service role — ignora RLS e libera a Admin API
 * (`auth.admin.*`). Usar SOMENTE em Server Actions, e sempre depois de validar
 * que o chamador é admin. Não persiste sessão.
 */
export function createAdminClient() {
  const key = serviceKey();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !key) {
    throw new Error(
      "Supabase service role key ausente (SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY).",
    );
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
