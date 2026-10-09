import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const PUBLIC = ["/login", "/auth", "/f/", "/oh/", "/legal"]; // /invite redirects to login itself, keeping the token // /f/<id>: public lead forms

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
  if (!data.user && !PUBLIC.some((p) => path.startsWith(p)))
    return path.startsWith("/api/")
      ? NextResponse.json({ error: "Sign in again." }, { status: 401 })
      : NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(path + req.nextUrl.search)}`, req.url));
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:png|jpg|svg|webp)$).*)"],
};
