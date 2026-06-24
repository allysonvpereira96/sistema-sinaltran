import { AppSidebar } from "@/components/app/sidebar";
import { AppTopbar } from "@/components/app/topbar";
import { getCurrentProfile } from "@/lib/actions/usuarios";
import { listEmpresas, getEmpresaAtiva } from "@/lib/actions/empresas";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, empresas, empresaAtiva] = await Promise.all([
    getCurrentProfile(),
    listEmpresas(),
    getEmpresaAtiva(),
  ]);

  return (
    <div className="flex-1 flex">
      <AppSidebar profile={profile} />
      <div className="flex-1 flex flex-col min-w-0">
        <AppTopbar
          profile={profile}
          empresas={empresas}
          empresaAtivaId={empresaAtiva?.id ?? null}
        />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
