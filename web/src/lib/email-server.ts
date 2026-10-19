// Server-only email sending through Resend. The database side is four narrow functions gated by EMAIL_DISPATCH_SECRET
// (claim, report, unsubscribe, event), so no master database key is needed. Never import from a client component.
import { renderEmail, unsubToken, type Brand } from "./email.ts";

const RESEND = () => ({ key: process.env.RESEND_API_KEY, base: (process.env.RESEND_API_URL || "https://api.resend.com").replace(/\/$/, "") });

/** What's missing before email can go out (empty = ready). Names only, never values. */
export function emailMissing(): string[] {
  return ["RESEND_API_KEY", "EMAIL_TOKEN_SECRET", "EMAIL_DISPATCH_SECRET", "SITE_URL"].filter((k) => !process.env[k]?.trim());
}

/** Call one of the dispatcher functions with the shared secret (public key + secret; the function checks it). */
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST", cache: "no-store",
    headers: { apikey: key!, authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ p_secret: process.env.EMAIL_DISPATCH_SECRET, ...args }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`db ${res.status}: ${text.slice(0, 200)}`);
  return (text ? JSON.parse(text) : null) as T; // functions that return nothing answer with an empty body
}

export type Outgoing = { from: string; to: string; subject: string; html: string; text: string; reply_to?: string; headers: Record<string, string> };

/** One call to Resend's batch endpoint (up to 100). Returns provider ids in order, or throws with Resend's message. */
export async function resendBatch(emails: Outgoing[]): Promise<string[]> {
  const { key, base } = RESEND();
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const res = await fetch(`${base}/emails/batch`, { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify(emails), cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as { data?: { id: string }[]; message?: string };
  if (!res.ok || !Array.isArray(body.data)) throw new Error(body.message ?? `Resend error ${res.status}`);
  return body.data.map((d) => d.id);
}

type Sender = { team: string; color: string | null; logo: string | null; from_name: string | null; from_address: string | null; reply_to: string | null; postal: string | null };
const logoUrl = (p: string | null) => (p ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/brand-logos/${p}` : null);
export const brandOf = (o: Sender): Brand => ({ team: o.from_name || o.team, color: o.color ?? "#c5f36a", logo: logoUrl(o.logo), address: o.postal ?? "" });
export const fromOf = (o: Sender) => `${(o.from_name || o.team).replace(/[<>"\r\n]/g, "")} <${o.from_address}>`;
export const unsubLinks = (contactId: string) => {
  const t = unsubToken(contactId, process.env.EMAIL_TOKEN_SECRET!), site = process.env.SITE_URL!;
  return { page: `${site}/u/${t}`, oneClick: `${site}/api/email/unsubscribe/${t}` };
};

type Claimed = Sender & { id: string; contact_id: string; campaign_id: string | null; to_email: string; subject: string | null; preheader: string; body: string | null; name: string; eligible: boolean };
type Result = { id: string; status: "sent" | "failed" | "skipped" | "queued"; provider_id?: string; error?: string; subject?: string };

/** Send what's queued (oldest first, up to `limit`). Safe to run concurrently: the database hands each message out once. */
export async function dispatchQueued(limit = 500): Promise<{ sent: number; skipped: number; failed: number }> {
  const out = { sent: 0, skipped: 0, failed: 0 };
  if (emailMissing().length) return out;
  const msgs = await rpc<Claimed[]>("email_claim", { p_limit: limit });
  if (!msgs.length) return out;
  const results: Result[] = [];
  const ready: { m: Claimed; email: Outgoing }[] = [];
  for (const m of msgs) {
    if (!m.from_address || !m.postal) { results.push({ id: m.id, status: "failed", error: "Sender address or postal address not set" }); out.failed++; continue; }
    if (!m.eligible) { results.push({ id: m.id, status: "skipped", error: "No email consent or unsubscribed" }); out.skipped++; continue; }
    const links = unsubLinks(m.contact_id), [first = "", ...rest] = m.name.split(" ");
    const r = renderEmail({ subject: m.subject ?? "", preheader: m.preheader, body: m.body ?? "", brand: brandOf(m), unsubscribeUrl: links.page,
      vars: { first_name: first, last_name: rest.join(" "), name: m.name, team: m.team, agent_name: m.from_name ?? m.team } });
    ready.push({ m, email: {
      from: fromOf(m), to: m.to_email, subject: r.subject, html: r.html, text: r.text, ...(m.reply_to && { reply_to: m.reply_to }),
      headers: { "List-Unsubscribe": `<${links.oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    } });
  }
  for (let i = 0; i < ready.length; i += 100) {
    const chunk = ready.slice(i, i + 100);
    try {
      const ids = await resendBatch(chunk.map((x) => x.email));
      chunk.forEach((x, j) => results.push({ id: x.m.id, status: "sent", provider_id: ids[j], subject: x.email.subject }));
      out.sent += chunk.length;
    } catch (e) {
      const error = e instanceof Error ? e.message.slice(0, 300) : "send failed";
      chunk.forEach((x) => results.push({ id: x.m.id, status: "queued", error })); // retried, then failed after 3 tries
      out.failed += chunk.length;
    }
  }
  await rpc("email_report", { p_results: results });
  return out;
}

export const unsubscribe = (contactId: string) => rpc<{ team: string } | null>("email_unsubscribe", { p_contact: contactId });
export const recordEvent = (type: string, providerId: string) => rpc<null>("email_event", { p_type: type, p_provider_id: providerId });

/** A one-off test of a campaign to the sender's own inbox (not tracked, not logged on any lead). */
export async function sendTest(o: { name: string; brand_color: string | null; logo_path: string | null; email_from_name: string | null; email_from_address: string | null; email_reply_to: string | null; email_postal_address: string | null }, to: string, c: { subject: string; preheader: string; body: string }, first: string): Promise<void> {
  const s: Sender = { team: o.name, color: o.brand_color, logo: o.logo_path, from_name: o.email_from_name, from_address: o.email_from_address, reply_to: o.email_reply_to, postal: o.email_postal_address };
  const r = renderEmail({ subject: `[Test] ${c.subject}`, preheader: c.preheader, body: c.body, brand: brandOf(s), unsubscribeUrl: `${process.env.SITE_URL}/u/test`,
    vars: { first_name: first, name: first, team: o.name, agent_name: o.email_from_name ?? o.name } });
  await resendBatch([{ from: fromOf(s), to, subject: r.subject, html: r.html, text: r.text, headers: {} }]);
}
