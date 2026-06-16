/**
 * Indica se o sistema está rodando com Supabase configurado.
 * Quando false, as features dependentes de DB devem usar mocks/fallback.
 */
export function hasSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
