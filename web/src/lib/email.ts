// Email newsletters and drips: rendering, unsubscribe tokens, audiences and webhook signatures. No I/O.
import { createHmac, timingSafeEqual } from "node:crypto";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export type Vars = { first_name?: string; last_name?: string; name?: string; agent_name?: string; team?: string };
/** {{first_name}} etc. Unknown fields become empty; values are inserted as text. */
export const fill = (s: string, v: Vars) => s.replace(/\{\{?\s*(first_name|last_name|name|agent_name|team)\s*\}\}?/g, (_, k: keyof Vars) => v[k] ?? "");

/** Body in plain words: blank line = new paragraph, "# " heading, "- " bullet, **bold**, [text](https://link). */
/** Links stay dark and underlined: a team's accent can be pale (lime, sky) and unreadable on white. */
export function bodyHtml(body: string): string {
  const inline = (line: string) => esc(line)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, t: string, u: string) => `<a href="${u}" style="color:#141414;text-decoration:underline">${t}</a>`);
  const out: string[] = [];
  let para: string[] = [], list: string[] = [];
  const flush = () => {
    if (para.length) out.push(`<p style="margin:0 0 16px">${para.map(inline).join("<br>")}</p>`);
    if (list.length) out.push(`<ul style="margin:0 0 16px;padding-left:20px">${list.map((l) => `<li style="margin:0 0 6px">${inline(l)}</li>`).join("")}</ul>`);
    para = []; list = [];
  };
  for (const line of body.replace(/\r/g, "").split("\n")) {
    if (!line.trim()) { flush(); continue; }
    const bullet = /^\s*[-*] (.*)$/.exec(line), heading = /^#{1,3} (.*)$/.exec(line);
    if (heading) { flush(); out.push(`<h2 style="margin:24px 0 8px;font-size:20px;line-height:1.3">${inline(heading[1])}</h2>`); }
    else if (bullet) { if (para.length) { const l = list; list = []; flush(); list = l; } list.push(bullet[1]); }
    else { if (list.length) { const p = para; para = []; flush(); para = p; } para.push(line); }
  }
  flush();
  return out.join("");
}

export const bodyText = (body: string) => body.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)").replace(/^#{1,3} /gm, "");

export type Brand = { team: string; color: string; logo: string | null; address: string };
/** The full message: team header, body, and the footer every marketing email must carry (who, where, unsubscribe). */
export function renderEmail(o: { subject: string; preheader?: string; body: string; vars: Vars; brand: Brand; unsubscribeUrl: string }): { subject: string; html: string; text: string } {
  const body = fill(o.body, o.vars), subject = fill(o.subject, o.vars).slice(0, 200), pre = fill(o.preheader ?? "", o.vars);
  const b = o.brand, accent = /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : "#111111";
  const head = b.logo ? `<img src="${esc(b.logo)}" alt="${esc(b.team)}" height="40" style="height:40px;max-width:200px;object-fit:contain">` : `<strong style="font-size:18px">${esc(b.team)}</strong>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f4;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#141414">`
    + `<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(pre)}</span>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px">`
    + `<tr><td style="padding:24px 28px 8px;border-top:4px solid ${accent};border-radius:12px 12px 0 0">${head}</td></tr>`
    + `<tr><td style="padding:16px 28px 8px;font-size:16px;line-height:1.6">${bodyHtml(body)}</td></tr>`
    + `<tr><td style="padding:16px 28px 24px;border-top:1px solid #eeeeee;font-size:12px;line-height:1.5;color:#5c5c5c">`
    + `${esc(b.team)}${b.address ? `<br>${esc(b.address)}` : ""}<br>You're getting this because you asked to hear from us. `
    + `<a href="${esc(o.unsubscribeUrl)}" style="color:#5c5c5c">Unsubscribe</a></td></tr></table></td></tr></table></body></html>`;
  const text = `${bodyText(body)}\n\n--\n${b.team}${b.address ? `\n${b.address}` : ""}\nUnsubscribe: ${o.unsubscribeUrl}\n`;
  return { subject, html, text };
}

/** Unsubscribe links: the contact id plus a keyed signature, so nobody can unsubscribe someone else by guessing. */
const sign = (id: string, secret: string) => createHmac("sha256", secret).update(`unsub:${id}`).digest("base64url").slice(0, 32);
export const unsubToken = (contactId: string, secret: string) => `${contactId}.${sign(contactId, secret)}`;
export function readUnsubToken(token: string, secret: string): string | null {
  const [id, sig] = token.split(".");
  if (!id || !sig || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const want = Buffer.from(sign(id, secret)), got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got) ? id : null;
}

export const LEAD_TYPES = ["buyer", "seller", "investor", "renter"] as const;
export type Audience = { types: string[]; stages: string[]; tags: string[]; pastClients: boolean };
/** Who a campaign goes to. Empty lists mean "any". Only leads who agreed to email are ever included (in the database). */
export function cleanAudience(raw: unknown, stages: readonly string[]): Audience {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = (v: unknown, ok: (s: string) => boolean) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && ok(x)))].slice(0, 20) : []);
  return {
    types: list(o.types, (t) => (LEAD_TYPES as readonly string[]).includes(t)),
    stages: list(o.stages, (s) => stages.includes(s)),
    tags: list(o.tags, (t) => /^[a-z0-9][a-z0-9 -]{0,39}$/.test(t)),
    pastClients: o.pastClients === true,
  };
}

/** Resend webhooks are signed the Svix way: HMAC-SHA256 over "id.timestamp.body" with the base64 secret after "whsec_". */
export function verifyWebhook(secret: string, id: string, timestamp: string, body: string, signatures: string, now = Date.now()): boolean {
  if (!secret.startsWith("whsec_") || !id || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const want = createHmac("sha256", Buffer.from(secret.slice(6), "base64")).update(`${id}.${timestamp}.${body}`).digest();
  return signatures.split(" ").some((s) => {
    const [v, sig] = s.split(",");
    if (v !== "v1" || !sig) return false;
    const got = Buffer.from(sig, "base64");
    return got.length === want.length && timingSafeEqual(got, want);
  });
}

/** A sender address on a real domain (the team verifies that domain in Resend). */
export const validFrom = (a: string) => /^[^@\s<>"]+@([a-z0-9-]+\.)+[a-z]{2,}$/i.test(a) && a.length <= 200;
