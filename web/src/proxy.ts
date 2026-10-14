import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { featureFor } from "@/lib/features";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const PUBLIC = ["/login", "/auth", "/f/", "/oh/", "/p/", "/legal", "/feeds/", "/api/chat/", "/api/v1/", "/tc/", "/welcome", "/store", "/site/"]; // /invite redirects to login itself, keeping the token // /f/<id>: public lead forms

/** Refreshes the Supabase session cookie and sends signed-out visitors to /login. */
export async function proxy(req: NextRequest) {
  if (!SB_URL || !KEY) return NextResponse.next(); // demo mode: no auth
  let res = NextResponse.next({ request: req });
  const db = createServerClient(SB_URL, KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (all) => {
        all.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        all.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await db.auth.getUser();
  const path = req.nextUrl.pathname;
  // Signed-out visitors at the root see the marketing site, not the sign-in form.
  if (!data.user && path === "/") return NextResponse.redirect(new URL("/welcome", req.url));
  if (!data.user && !PUBLIC.some((p) => path.startsWith(p)))
    return path.startsWith("/api/")
      ? NextResponse.json({ error: "Sign in again." }, { status: 401 })
      : NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(path + req.nextUrl.search)}`, req.url));
  // Enrolled in two-step sign-in but only past the password: finish with the code first (the database also refuses aal1).
  if (data.user && !PUBLIC.some((p) => path.startsWith(p)) && path !== "/mfa") {
    const { data: aal } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2")
      return path.startsWith("/api/")
        ? NextResponse.json({ error: "Enter your sign-in code first." }, { status: 401 })
        : NextResponse.redirect(new URL(`/mfa?next=${encodeURIComponent(path + req.nextUrl.search)}`, req.url));
  }
  // Modules the team's owner switched off are closed for everyone on the team, not just hidden from the menu.
  const feature = data.user ? featureFor(path) : null;
  if (feature) {
    const { data: brand } = await db.rpc("app_brand");
    if ((brand as { off?: string[] } | null)?.off?.includes(feature)) return NextResponse.redirect(new URL("/", req.url));
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:png|jpg|svg|webp)$).*)"],
};
