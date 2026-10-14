// Server-only Google calls (Gmail send, Calendar events) for the signed-in user's own connected account.
// Never import from a client component: it reads the OAuth secret and the token encryption key.
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEmail, open } from "./google";

export const GOOGLE_MISSING = "Google isn't set up on the server yet (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_TOKEN_KEY).";

export function googleEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID, secret = process.env.GOOGLE_CLIENT_SECRET, key = process.env.GOOGLE_TOKEN_KEY, site = process.env.SITE_URL;
  return clientId && secret && key && site ? { clientId, secret, key, redirectUri: `${site.replace(/\/$/, "")}/api/google/callback` } : null;
}

export class GoogleError extends Error {}

/** A fresh access token for the signed-in user, or null if they haven't connected Google. */
async function session(db: SupabaseClient): Promise<{ token: string; email: string } | null> {
  const env = googleEnv();
  if (!env) throw new GoogleError(GOOGLE_MISSING);
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data: row } = await db.from("google_accounts").select("email,token_enc").eq("user_id", user.id).maybeSingle();
  if (!row) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.clientId, client_secret: env.secret, grant_type: "refresh_token", refresh_token: open(row.token_enc, env.key) }),
    signal: AbortSignal.timeout(15_000),
  });
  const j = await res.json().catch(() => ({}));
  if (j.error === "invalid_grant") {
    // Revoked or expired on Google's side: drop the dead connection so the UI asks to reconnect.
    await db.from("google_accounts").delete().eq("user_id", user.id);
    throw new GoogleError("Your Google connection expired. Reconnect Google on the Account page.");
  }
  if (!res.ok || !j.access_token) throw new GoogleError("Couldn't reach Google. Try again.");
  return { token: j.access_token, email: row.email };
}

export async function googleConnected(db: SupabaseClient): Promise<string | null> {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("google_accounts").select("email").eq("user_id", user.id).maybeSingle();
  return data?.email ?? null;
}

/** Send a plain-text email from the user's own Gmail. Returns the Gmail message id. */
export async function sendGmail(db: SupabaseClient, m: { fromName?: string; to: string; toName?: string; subject: string; text: string }): Promise<string> {
  const s = await session(db);
  if (!s) throw new GoogleError("Connect Google on the Account page to send email.");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST", headers: { authorization: `Bearer ${s.token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw: buildEmail({ from: s.email, ...m }) }), signal: AbortSignal.timeout(20_000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new GoogleError(res.status === 403 ? "Google didn't allow sending. Reconnect Google and allow sending email." : "Gmail didn't accept the message. Try again.");
  return j.id as string;
}

type Ev = { title: string; startsAt: string; endsAt: string; location: string; description: string };

/** Create or update the event on the user's primary calendar. Returns the event id, or null when not connected. */
export async function upsertEvent(db: SupabaseClient, e: Ev, eventId?: string | null): Promise<string | null> {
  const s = await session(db);
  if (!s) return null;
  const body = { summary: e.title.slice(0, 300), location: e.location.slice(0, 500), description: e.description.slice(0, 4000), start: { dateTime: e.startsAt }, end: { dateTime: e.endsAt }, reminders: { useDefault: true } };
  const base = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  const res = await fetch(eventId ? `${base}/${encodeURIComponent(eventId)}` : base, {
    method: eventId ? "PATCH" : "POST", headers: { authorization: `Bearer ${s.token}`, "content-type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new GoogleError("Google Calendar didn't save the event.");
  return j.id as string;
}

export async function deleteEvent(db: SupabaseClient, eventId: string): Promise<void> {
  const s = await session(db);
  if (!s) return;
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE", headers: { authorization: `Bearer ${s.token}` }, signal: AbortSignal.timeout(15_000),
  });
}
