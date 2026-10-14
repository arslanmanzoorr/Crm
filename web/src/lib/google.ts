// Google connection helpers with no network I/O: token encryption, the consent URL, and the email format.
// Refresh tokens are stored only encrypted (AES-256-GCM) with GOOGLE_TOKEN_KEY, which lives in the server env.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/calendar.events"];

const key = (b64: string) => {
  const k = Buffer.from(b64, "base64");
  if (k.length !== 32) throw new Error("GOOGLE_TOKEN_KEY must be 32 bytes, base64.");
  return k;
};

/** "v1.<iv>.<tag>.<ciphertext>", all base64url. */
export function seal(plain: string, keyB64: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(keyB64), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv, c.getAuthTag(), body].map((x) => (typeof x === "string" ? x : x.toString("base64url"))).join(".");
}

export function open(sealed: string, keyB64: string): string {
  const [v, iv, tag, body] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !body) throw new Error("Unreadable token.");
  const d = createDecipheriv("aes-256-gcm", key(keyB64), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
}

export function consentUrl(o: { clientId: string; redirectUri: string; state: string; loginHint?: string }) {
  const q = new URLSearchParams({
    client_id: o.clientId, redirect_uri: o.redirectUri, response_type: "code", scope: SCOPES.join(" "),
    access_type: "offline", prompt: "consent", include_granted_scopes: "true", state: o.state, ...(o.loginHint && { login_hint: o.loginHint }),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

const header = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
/** RFC 2047 encoded-word so names and subjects with accents survive. */
const word = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`);
const EMAIL = /^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/;

/** A plain-text email ready for Gmail's send API (base64url). Header injection is impossible: no CR/LF reaches a header. */
export function buildEmail(m: { from: string; fromName?: string; to: string; toName?: string; subject: string; text: string }): string {
  if (!EMAIL.test(m.to) || !EMAIL.test(m.from)) throw new Error("Bad email address.");
  const addr = (email: string, name?: string) => (name ? `${word(header(name).replace(/"/g, ""))} <${email}>` : email);
  const raw = [
    `From: ${addr(m.from, m.fromName)}`,
    `To: ${addr(m.to, m.toName)}`,
    `Subject: ${word(header(m.subject).slice(0, 200))}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(m.text.replace(/\r?\n/g, "\r\n"), "utf8").toString("base64").replace(/.{76}/g, "$&\r\n"),
  ].join("\r\n");
  return Buffer.from(raw, "utf8").toString("base64url");
}
