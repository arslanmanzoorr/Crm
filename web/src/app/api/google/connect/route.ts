import { cookies } from "next/headers";
import { consentUrl } from "@/lib/google";
import { GOOGLE_MISSING, googleEnv } from "@/lib/google-server";
import { supabase } from "@/lib/db";

/** Start "Connect Google": a one-time state in an httpOnly cookie ties Google's redirect back to this user. */
export async function GET() {
  const env = googleEnv();
  if (!env) return new Response(GOOGLE_MISSING, { status: 503 });
  const { data: { user } } = await (await supabase()).auth.getUser();
  if (!user) return Response.redirect(new URL("/login?next=/account", env.redirectUri), 303);
  const state = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");
  (await cookies()).set("g_state", `${state}.${user.id}`, { httpOnly: true, secure: env.redirectUri.startsWith("https://"), sameSite: "lax", path: "/api/google", maxAge: 600 });
  return Response.redirect(consentUrl({ clientId: env.clientId, redirectUri: env.redirectUri, state, loginHint: user.email ?? undefined }), 303);
}
