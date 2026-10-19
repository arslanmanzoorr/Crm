// Which outside services are connected, from server environment variables. Never exposes a value: only whether
// each required variable is set. Secrets live in the host's environment (Vercel), never in the database.

export const INTEGRATIONS = [
  { name: "Database and sign-in", keys: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"], unlocks: "Everything. Without it the app runs on demo data." },
  { name: "Site address", keys: ["SITE_URL"], unlocks: "Sign-in email links, lead form, portal and feed links." },
  { name: "Public forms", keys: ["FORM_RPC_KEY", "FORM_IP_SALT"], unlocks: "Lead form, open house sign-in, privacy requests, home valuation, Zillow rentals feed." },
  { name: "Private file delivery", keys: ["SUPABASE_SERVICE_ROLE_KEY"], unlocks: "Clients downloading shared documents from their portal; photos in the Zillow rentals feed." },
  { name: "AI (OpenRouter)", keys: ["OPENROUTER_API_KEY"], unlocks: "Lead analysis, reply drafts, captions, website chat, business card scanning, profile updates." },
  { name: "Google (Gmail and Calendar)", keys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_TOKEN_KEY"], unlocks: "Each agent connects their own Google: email leads from Gmail, showings on Google Calendar." },
  { name: "Custom domains (Vercel)", keys: ["VERCEL_TOKEN", "VERCEL_PROJECT_ID"], unlocks: "Teams' own domains connect to hosting automatically once verified. Without it, add each verified domain in the Vercel dashboard." },
  { name: "Email sending (Resend)", keys: ["RESEND_API_KEY", "EMAIL_TOKEN_SECRET", "EMAIL_DISPATCH_SECRET"], unlocks: "Newsletters, monthly market updates and automated emails, with unsubscribe and delivery tracking. RESEND_WEBHOOK_SECRET adds opens, clicks and bounces." },
  { name: "Social publishing (n8n)", keys: ["N8N_PUBLISH_WEBHOOK_URL"], unlocks: "Posting to social platforms from Publish." },
] as const;

export function integrationStatus(env: Record<string, string | undefined>) {
  return INTEGRATIONS.map((i) => {
    const missing = i.keys.filter((k) => !env[k]?.trim());
    return { name: i.name, unlocks: i.unlocks, connected: missing.length === 0, missing };
  });
}
