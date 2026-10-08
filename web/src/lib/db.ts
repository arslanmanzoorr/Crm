// Server-side data access. Uses Supabase when its env vars are set, else the mock data in ./data.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import * as mock from "./data";
import type { Channel, Lead, Property, Stage, Task, Thread } from "./data";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const dbEnabled = Boolean(SB_URL && KEY);

export async function supabase() {
  await connection(); // per-request data; the client reads Date.now() for session expiry
  const store = await cookies();
  return createServerClient(SB_URL!, KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (all) => {
        try {
          all.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

type ActivityRow = { channel: Channel; content: string; ts: string; direction: "in" | "out" };
type ContactRow = {
  id: string; type: string; stage: Stage; next_action: string; name: string; email: string | null; phone: string | null; sources: string[];
  score: number; consent_sms: boolean; consent_call: boolean; consent_email: boolean; dnc: boolean; intent: string; budget: string; areas: string[]; preferences: string[]; activities: ActivityRow[];
};

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function toLead(r: ContactRow): Lead {
  const activity = [...r.activities].sort((a, b) => b.ts.localeCompare(a.ts));
  return {
    id: r.id,
    name: r.name,
    headline: [cap(r.type), r.areas.join(", "), r.budget].filter(Boolean).join(" · "),
    sources: r.sources as Lead["sources"],
    score: r.score,
    intent: r.intent || "Not analyzed yet",
    lastTouch: activity[0]?.content ?? "No activity yet",
    email: r.email ?? "",
    phone: r.phone ?? "",
    budget: r.budget,
    areas: r.areas,
    preferences: r.preferences,
    activity: activity.map((a) => ({ when: a.ts, channel: a.channel, text: a.content, inbound: a.direction === "in" })),
    type: r.type,
    stage: r.stage,
    nextAction: r.next_action,
    consent: { sms: r.consent_sms, call: r.consent_call, email: r.consent_email, dnc: r.dnc },
  };
}

const TONES = mock.properties.map((p) => p.tone);
const toProperty = (r: Omit<Property, "tone" | "price" | "baths"> & { price: number | string; baths: number | string }, i: number): Property =>
  ({ ...r, price: Number(r.price), baths: Number(r.baths), tone: TONES[i % TONES.length] });

const CONTACT_COLS = "id,type,stage,next_action,name,email,phone,sources,score,consent_sms,consent_call,consent_email,dnc,intent,budget,areas,preferences,activities(channel,content,ts,direction)";
const PROPERTY_COLS = "id,address,area,price,beds,baths,sqft,status,features,description";

function must<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export type Temp = "Hot" | "Warm" | "Cold";
export const PAGE = 30;
const TEMP_RANGE: Record<Temp, [number, number]> = { Hot: [80, 100], Warm: [50, 79], Cold: [0, 49] };

/** Strip characters PostgREST/LIKE treat as syntax, so a search is always a plain substring match. */
const likeSafe = (q: string) => q.toLowerCase().replace(/[%_*\,()]/g, " ").trim().slice(0, 80);

/**
 * One page of leads with only their latest activity. Search and filters run in Postgres
 * (trigram index on contacts.search), so this stays fast at any list size.
 */
export async function listLeads({ q = "", temp, limit = PAGE }: { q?: string; temp?: Temp; limit?: number }) {
  if (!dbEnabled) {
    const all = mock.leads.filter((l) => `${l.name} ${l.headline}`.toLowerCase().includes(q.toLowerCase()));
    return { leads: all, total: all.length, counts: { All: all.length, Hot: 0, Warm: 0, Cold: 0 } };
  }
  const db = await supabase();
  const term = likeSafe(q);
  const base = () => {
    let b = db.from("contacts").select("id", { count: "exact", head: true });
    if (term) b = b.ilike("search", `%${term}%`);
    return b;
  };
  let query = db.from("contacts").select(CONTACT_COLS, { count: "exact" })
    .order("ts", { referencedTable: "activities", ascending: false }).limit(1, { referencedTable: "activities" });
  if (term) query = query.ilike("search", `%${term}%`);
  if (temp) query = query.gte("score", TEMP_RANGE[temp][0]).lte("score", TEMP_RANGE[temp][1]);
  const [res, all, ...temps] = await Promise.all([
    query.order("score", { ascending: false }).order("id").range(0, Math.min(limit, 500) - 1),
    base(),
    ...(["Hot", "Warm", "Cold"] as Temp[]).map((t) => base().gte("score", TEMP_RANGE[t][0]).lte("score", TEMP_RANGE[t][1])),
  ]);
  const rows = must(res) as ContactRow[];
  return {
    leads: rows.map(toLead),
    total: res.count ?? rows.length,
    counts: { All: all.count ?? 0, Hot: temps[0].count ?? 0, Warm: temps[1].count ?? 0, Cold: temps[2].count ?? 0 },
  };
}

/** Workspace: hottest open leads (latest activity only) plus the org's lead total. */
export async function getTopLeads(n = 12): Promise<{ leads: Lead[]; total: number }> {
  if (!dbEnabled) return { leads: mock.leads, total: mock.leads.length };
  const res = await (await supabase()).from("contacts").select(CONTACT_COLS, { count: "exact" })
    .not("stage", "in", "(Closed,Lost)")
    .order("ts", { referencedTable: "activities", ascending: false }).limit(1, { referencedTable: "activities" })
    .order("score", { ascending: false }).order("id").limit(n);
  return { leads: (must(res) as ContactRow[]).map(toLead), total: res.count ?? 0 };
}

/** Names for pickers (task form): most recently active first. */
export async function getLeadOptions(): Promise<{ id: string; name: string }[]> {
  if (!dbEnabled) return mock.leads.map(({ id, name }) => ({ id, name }));
  // ponytail: top 200 by recency; switch the picker to a server-search combobox past that.
  return must(await (await supabase()).from("contacts").select("id,name")
    .order("last_activity_at", { ascending: false, nullsFirst: false }).limit(200));
}

export async function getLead(id: string): Promise<Lead | undefined> {
  if (!dbEnabled) return mock.leadById(id);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  const { data } = await (await supabase()).from("contacts").select(CONTACT_COLS)
    .order("ts", { referencedTable: "activities", ascending: false }).limit(200, { referencedTable: "activities" })
    .eq("id", id).maybeSingle();
  return data ? toLead(data as ContactRow) : undefined;
}

export async function getProperties(): Promise<Property[]> {
  if (!dbEnabled) return mock.properties;
  const rows = must(await (await supabase()).from("properties").select(PROPERTY_COLS).order("created_at"));
  return (rows as Parameters<typeof toProperty>[0][]).map(toProperty);
}

export async function getProperty(id: string): Promise<Property | undefined> {
  return (await getProperties()).find((p) => p.id === id);
}

/** Display name for the signed-in agent (email prefix until profiles exist). */
export async function getMe(): Promise<{ name: string; email?: string }> {
  if (!dbEnabled) return mock.agent;
  const { data } = await (await supabase()).auth.getUser();
  const handle = data.user?.email?.split("@")[0] ?? "there";
  return { name: handle.split(/[._-]/).map(cap).join(" "), email: data.user?.email };
}

type TaskRow = {
  id: string; kind: Task["kind"]; title: string; note: string; due_at: string; done: boolean; created_by: string;
  contacts: { id: string; name: string; type: string; phone: string | null; email: string | null; consent_call: boolean; consent_email: boolean; dnc: boolean } | null;
};

/** Open tasks plus anything finished today, soonest first. */
export async function getTasks(): Promise<Task[]> {
  if (!dbEnabled) return mock.tasks;
  const db = await supabase(); // first: marks the request dynamic before Date.now()
  const since = new Date(Date.now() - 36 * 3600_000).toISOString();
  const rows = must(await db.from("tasks")
    .select("id,kind,title,note,due_at,done,created_by,contacts(id,name,type,phone,email,consent_call,consent_email,dnc)")
    .or(`done.eq.false,due_at.gte.${since}`).order("due_at").limit(100));
  return (rows as unknown as TaskRow[]).map((t) => ({
    id: t.id, kind: t.kind, title: t.title, note: t.note, dueAt: t.due_at, done: t.done,
    contact: t.contacts?.name ?? "", contactRole: t.contacts ? cap(t.contacts.type) : "",
    contactId: t.contacts?.id,
    // Only expose contact details the lead consented to; the UI then can't offer a non-compliant Start.
    phone: t.contacts && t.contacts.consent_call && !t.contacts.dnc ? t.contacts.phone ?? "" : "",
    email: t.contacts && t.contacts.consent_email && !t.contacts.dnc ? t.contacts.email ?? "" : "",
    when: "", dueToday: false, priority: t.created_by === "ai",
  }));
}

const MSG_CHANNELS: Channel[] = ["SMS", "WhatsApp", "Email", "Instagram"];

/** One thread per lead + channel, from the latest 500 messages across the org; most recent first. */
export async function getThreads(): Promise<Thread[]> {
  if (!dbEnabled) return mock.mockThreads;
  type Row = ActivityRow & { contacts: { id: string; name: string; phone: string | null; email: string | null; intent: string; budget: string; preferences: string[] } };
  const rows = must(await (await supabase()).from("activities")
    .select("channel,content,ts,direction,contacts(id,name,phone,email,intent,budget,preferences)")
    .in("channel", MSG_CHANNELS).order("ts", { ascending: false }).limit(500)) as unknown as Row[];
  const byKey = new Map<string, Thread>();
  for (const r of rows.reverse()) {
    const c = r.contacts;
    const key = c.id + r.channel;
    if (!byKey.has(key))
      byKey.set(key, { leadId: c.id, name: c.name, phone: c.phone ?? "", email: c.email ?? "", channel: r.channel, lead: c, messages: [] });
    byKey.get(key)!.messages.push({ from: r.direction === "in" ? "lead" : "agent", text: r.content, at: r.ts });
  }
  return [...byKey.values()].sort((a, b) => b.messages.at(-1)!.at.localeCompare(a.messages.at(-1)!.at));
}

const AI_DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 200);

/**
 * Per-org AI spend cap. Returns an error message when the org hit its 24h limit, else logs the call.
 * ponytail: count-then-insert can overshoot by a few under concurrency; fine for a soft cap, move to a DB function if it becomes billing.
 */
export async function meterAi(task: string): Promise<string | null> {
  if (!dbEnabled) return null;
  const db = await supabase();
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count, error } = await db.from("ai_usage").select("id", { count: "exact", head: true }).gte("ts", since);
  if (error) return "Sign in again.";
  if ((count ?? 0) >= AI_DAILY_LIMIT) return `Daily AI limit reached (${AI_DAILY_LIMIT}). It resets over the next 24 hours.`;
  const { data } = await db.auth.getUser();
  await db.from("ai_usage").insert({ task, user_id: data.user?.id });
  return null;
}

/** Fail closed: a production deploy without Supabase must not serve the demo as if it were the product. */
if (process.env.NODE_ENV === "production" && process.env.VERCEL && !dbEnabled)
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set in production.");
