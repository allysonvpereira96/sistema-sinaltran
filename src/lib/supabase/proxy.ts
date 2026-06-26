import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { moduloDaRota } from "@/config/navigation";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/login");
  // /assinatura-epi/* é público — o colaborador assina pelo celular, sem login.
  const isPublicRoute = isAuthRoute || pathname === "/" || pathname.startsWith("/assinatura-epi");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Controle de acesso por módulo: usuários não-admin só acessam os módulos
  // liberados em profiles.modulos. /configuracoes/usuarios exige role admin.
  if (user && !isPublicRoute) {
    const modulo = moduloDaRota(pathname);
    const isUsuariosPage = pathname.startsWith("/configuracoes/usuarios");

    if (modulo || isUsuariosPage) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, modulos")
        .eq("id", user.id)
        .maybeSingle();

      const isAdmin = profile?.role === "admin";
      const modulos = (profile?.modulos ?? []) as string[];

      const bloqueado = isUsuariosPage
        ? !isAdmin
        : !isAdmin && !!modulo && !modulos.includes(modulo);

      if (bloqueado) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
