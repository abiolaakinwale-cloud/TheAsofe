import { NextResponse, type NextRequest } from "next/server";
import { getMiddlewareSupabase } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { supabase, response } = getMiddlewareSupabase(request);

  // Refresh the session cookie if needed. Without this call, Server Components
  // would race against an expired session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // Match /admin exactly or paths under /admin/ — must NOT match /admin-signin.
  const isAdminPath = path === "/admin" || path.startsWith("/admin/");
  const protectedPath =
    isAdminPath || path.startsWith("/dashboard") || path.startsWith("/account");

  if (protectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = isAdminPath ? "/admin-signin" : "/signin";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (isAdminPath && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets and image optimisation
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
