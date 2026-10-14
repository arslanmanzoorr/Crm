import { cookies } from "next/headers";
import { seal, SCOPES } from "@/lib/google";
import { googleEnv } from "@/lib/google-server";
import { supabase } from "@/lib/db";

/** Google sends the user back here with a one-time code; we keep only the encrypted refresh token. */
export async function GET(req: Request) {
  const env = googleEnv();
  const site = process.env.SITE_URL ?? new URL(req.url).origin;
  const back = (status: string) => Response.redirect(new URL(`/account?google=${status}`, site), 303);
  if (!env) return back("unavailable");
  const q = new URL(req.url).searchParams;
  const jar = await cookies();
  const [state, uid] = (jar.get("g_state")?.value ?? "").split(".");
  jar.delete({ name: "g_state", path: "/api/google" });
  const db = await supabase();
  const { data: { user } } = await db.auth.getUser();
  // Same browser, same user, same request we started: otherwise refuse (stops login-CSRF and code injection).
  if (!user || !state || q.get("state") !== state || uid !== user.id) return back("failed");
  if (q.get("error") || !q.get("code")) return back("cancelled");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code: q.get("code")!, client_id: env.clientId, client_secret: env.secret, redirect_uri: env.redirectUri, grant_type: "authorization_code" }),
    signal: AbortSignal.timeout(15_000),
  });
  const t = await res.json().catch(() => ({}));
  if (!res.ok || !t.refresh_token || !t.access_token) return back("failed");
  const granted = String(t.scope ?? "").split(" ");
  if (!SCOPES.filter((s) => s.startsWith("https://")).every((s) => granted.includes(s))) return back("scopes");
  const who = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${t.access_token}` }, signal: AbortSignal.timeout(15_000) }).then((r) => r.json()).catch(() => ({}));
  if (!who.email || who.email_verified === false) return back("failed");

  const { error } = await db.from("google_accounts").upsert({ user_id: user.id, email: String(who.email).toLowerCase(), token_enc: seal(t.refresh_token, env.key), scopes: granted.join(" "), connected_at: new Date().toISOString() });
  return back(error ? "failed" : "connected");
}
