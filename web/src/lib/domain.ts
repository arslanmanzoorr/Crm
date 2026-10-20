// Custom domains for client-facing pages. Pure helpers shared by the proxy, server actions and tests.

const HOST = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** "https://Homes.Example.com/x" → "homes.example.com"; null if it isn't a public hostname we can serve. */
export function cleanDomain(input: string, appHost = ""): string | null {
  const d = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/?#].*$/, "").replace(/\.$/, "");
  if (d.length > 253 || !HOST.test(d)) return null;
  if (d === appHost || /(^|\.)(vercel\.app|localhost|supabase\.co|estos\.app)$/.test(d)) return null;
  return d;
}

/** The TXT record a team adds at _estos.<domain> to prove it controls the domain. */
export async function domainToken(orgId: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`estos-domain:${orgId}`));
  return `estos-verify=${Buffer.from(hash).toString("hex").slice(0, 32)}`;
}

/** Which client page a path is, for the custom-domain gate. Everything else stays on the main app. */
export function clientPage(path: string): { kind: "form" | "oh" | "portal"; id: string } | null {
  const m = path.match(/^\/(f|oh|p)\/([^/]+)(\/.*)?$/);
  if (!m) return null;
  let id: string;
  try { id = decodeURIComponent(m[2]); } catch { return null; } // malformed %-escape: not a page we serve
  return { kind: m[1] === "f" ? "form" : m[1] === "oh" ? "oh" : "portal", id };
}

/** Base URL for links clients receive: the team's verified domain, else the app. */
export const clientBase = (domain: string | null | undefined) => (domain ? `https://${domain}` : process.env.SITE_URL ?? "");
