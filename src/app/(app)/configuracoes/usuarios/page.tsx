import { redirect } from "next/navigation";
import { getCurrentProfile, listUsuarios } from "@/lib/actions/usuarios";
import { hasAdminKey } from "@/lib/supabase/admin";
import { UsuariosList } from "./_components/usuarios-list";

export default async function UsuariosPage() {
  const profile = await getCurrentProfile();

  // Defesa em profundidade: o proxy já bloqueia, mas garantimos no server.
  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const usuarios = await listUsuarios();

  return (
    <UsuariosList
      usuarios={usuarios}
      currentUserId={profile.id}
      canManageLogins={hasAdminKey()}
    />
  );
}
