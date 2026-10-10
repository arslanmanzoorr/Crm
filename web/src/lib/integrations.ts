// Which outside services are connected, from server environment variables. Never exposes a value: only whether
// each required variable is set. Secrets live in the host's environment (Vercel), never in the database.

export const INTEGRATIONS = [
  { name: "Database and sign-in", keys: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"], unlocks: "Everything. Without it the app runs on demo data." },
  { name: "Site address", keys: ["SITE_URL"], unlocks: "Sign-in email links, lead form, portal and feed links." },
  { name: "Public forms", keys: ["FORM_RPC_KEY", "FORM_IP_SALT"], unlocks: "Lead form, open house sign-in, privacy requests, home valuation, Zillow rentals feed." },
  { name: "AI (OpenRouter)", keys: ["OPENROUTER_API_KEY"], unlocks: "Lead analysis, reply drafts, captions." },
  { name: "Social publishing (n8n)", keys: ["N8N_PUBLISH_WEBHOOK_URL"], unlocks: "Posting to social platforms from Publish." },
] as const;

export function integrationStatus(env: Record<string, string | undefined>) {
  return INTEGRATIONS.map((i) => {
    const missing = i.keys.filter((k) => !env[k]?.trim());
    return { name: i.name, unlocks: i.unlocks, connected: missing.length === 0, missing };
  });
}
