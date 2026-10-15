// Server-only: attach a team's verified custom domain to the Vercel project so it gets routed and a certificate.
// Needs VERCEL_TOKEN (a token scoped to this project's team) and VERCEL_PROJECT_ID; VERCEL_TEAM_ID when the project
// lives under a team. Without them the domain still works once someone adds it in the Vercel dashboard.

const env = () => {
  const token = process.env.VERCEL_TOKEN, project = process.env.VERCEL_PROJECT_ID, team = process.env.VERCEL_TEAM_ID;
  return token && project ? { token, project, q: team ? `?teamId=${encodeURIComponent(team)}` : "" } : null;
};
export const vercelConfigured = () => env() !== null;

async function call(path: string, init: RequestInit = {}) {
  const e = env();
  if (!e) return null;
  const res = await fetch(`https://api.vercel.com${path.replace("{p}", encodeURIComponent(e.project))}${e.q}`, {
    ...init, headers: { authorization: `Bearer ${e.token}`, "content-type": "application/json" }, cache: "no-store",
  });
  return { ok: res.ok, status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, unknown> };
}

/** Adds the domain to the project (already added counts as success). */
export async function attachDomain(domain: string): Promise<boolean> {
  const r = await call("/v10/projects/{p}/domains", { method: "POST", body: JSON.stringify({ name: domain }) });
  return !!r && (r.ok || (r.body.error as { code?: string } | undefined)?.code === "domain_already_in_use_by_project" || r.status === 409);
}

export async function detachDomain(domain: string): Promise<void> {
  await call(`/v9/projects/{p}/domains/${encodeURIComponent(domain)}`, { method: "DELETE" });
}

/** "ok" once DNS points at Vercel, "dns" while it doesn't yet, null when Vercel isn't connected. */
export async function domainDns(domain: string): Promise<"ok" | "dns" | null> {
  const r = await call(`/v6/domains/${encodeURIComponent(domain)}/config`);
  if (!r?.ok) return null;
  return r.body.misconfigured ? "dns" : "ok";
}
