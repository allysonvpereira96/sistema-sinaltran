import { Info } from "lucide-react";

export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return (
    <div className="bg-amber-100 border-b border-amber-200 text-amber-900 px-4 py-1.5 text-xs flex items-center justify-center gap-2">
      <Info className="size-3.5" />
      <span>
        <strong>Modo demonstração</strong> — Supabase não conectado. Dados
        mockados, qualquer credencial entra no login.
      </span>
    </div>
  );
}
