import { supabase } from "@/lib/db";
import { apiKey, badKey } from "@/lib/api-v1";

/** GET /api/v1/leads?since=ISO&limit=100 — newest first, up to 500. */
export async function GET(req: Request) {
  const key = apiKey(req);
  if (key instanceof Response) return key;
  const q = new URL(req.url).searchParams;
  const since = q.get("since");
  if (since && Number.isNaN(Date.parse(since))) return Response.json({ error: "since must be an ISO date" }, { status: 400 });
  const { data, error } = await (await supabase()).rpc("api_leads", { p_key: key, p_since: since, p_limit: Number(q.get("limit")) || 100 });
  if (error) return Response.json({ error: "Server error" }, { status: 500 });
  return data === null ? badKey() : Response.json({ leads: data });
}

/** POST /api/v1/leads {name, email?, phone?, message?, source?, consent_call_sms?, consent_email?} — same rules as the web form. */
export async function POST(req: Request) {
  const key = apiKey(req);
  if (key instanceof Response) return key;
  let b: Record<string, unknown>;
  try { b = JSON.parse((await req.text()).slice(0, 20_000)); } catch { return Response.json({ error: "Body must be JSON" }, { status: 400 }); }
  const s = (k: string) => (typeof b[k] === "string" ? (b[k] as string) : null);
  const { data, error } = await (await supabase()).rpc("api_create_lead", {
    p_key: key, p_name: s("name"), p_email: s("email"), p_phone: s("phone"), p_message: s("message"), p_source: s("source"),
    p_consent_call_sms: b.consent_call_sms === true, p_consent_email: b.consent_email === true,
  });
  if (error) return Response.json({ error: "Server error" }, { status: 500 });
  if (data === null) return badKey();
  const r = data as { error?: string; id?: string; created?: boolean };
  return r.error ? Response.json(r, { status: 422 }) : Response.json(r, { status: r.created ? 201 : 200 });
}
