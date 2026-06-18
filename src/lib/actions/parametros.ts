"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { SALARIO_MINIMO_PADRAO } from "@/lib/rh";

export type Parametro = {
  chave: string;
  valor: string;
  descricao: string | null;
  grupo: string | null;
};

/** Parâmetros padrão usados quando não há Supabase configurado. */
const PADROES: Parametro[] = [
  {
    chave: "salario_minimo",
    valor: String(SALARIO_MINIMO_PADRAO),
    descricao: "Salário mínimo nacional vigente — base de cálculo da insalubridade",
    grupo: "RH",
  },
];

export async function listParametros(): Promise<Parametro[]> {
  if (!hasSupabase()) return PADROES;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parametros")
    .select("chave, valor, descricao, grupo")
    .order("grupo", { ascending: true })
    .order("chave", { ascending: true });
  if (error) {
    console.error("[listParametros]", error.message);
    return PADROES;
  }
  return (data ?? []) as Parametro[];
}

/** Lê um parâmetro numérico, com fallback. */
export async function getParametroNumero(chave: string, fallback: number): Promise<number> {
  if (!hasSupabase()) return fallback;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parametros")
    .select("valor")
    .eq("chave", chave)
    .maybeSingle();
  if (error || !data) return fallback;
  const n = Number(String(data.valor).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

/** Salário mínimo vigente (parâmetro "salario_minimo"). */
export async function getSalarioMinimo(): Promise<number> {
  return getParametroNumero("salario_minimo", SALARIO_MINIMO_PADRAO);
}

/** Salva os valores informados (atualiza por chave). */
export async function salvarParametros(
  updates: { chave: string; valor: string }[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  for (const u of updates) {
    const { error } = await supabase
      .from("parametros")
      .update({ valor: u.valor })
      .eq("chave", u.chave);
    if (error) {
      console.error("[salvarParametros]", u.chave, error.message);
      return { ok: false, error: error.message };
    }
  }
  revalidatePath("/configuracoes/parametros");
  revalidatePath("/pessoal/colaboradores");
  return { ok: true };
}
