import { AppSidebar } from "@/components/app/sidebar";
import { AppTopbar } from "@/components/app/topbar";
import { getCurrentProfile } from "@/lib/actions/usuarios";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  return (
    <div className="flex-1 flex">
      <AppSidebar profile={profile} />
      <div className="flex-1 flex flex-col min-w-0">
        <AppTopbar profile={profile} />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
