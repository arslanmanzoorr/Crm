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

export async function getLeads(): Promise<Lead[]> {
  if (!dbEnabled) return mock.leads;
  const rows = must(await (await supabase()).from("contacts").select(CONTACT_COLS).order("score", { ascending: false }));
  return (rows as ContactRow[]).map(toLead);
}

export async function getLead(id: string): Promise<Lead | undefined> {
  if (!dbEnabled) return mock.leadById(id);
  const { data } = await (await supabase()).from("contacts").select(CONTACT_COLS).eq("id", id).maybeSingle();
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

/** One thread per lead + channel, built from logged messages; most recent first. */
export async function getThreads(): Promise<Thread[]> {
  if (!dbEnabled) return mock.mockThreads;
  const leads = await getLeads();
  const threads = leads.flatMap((l) =>
    MSG_CHANNELS.map((channel) => {
      const msgs = l.activity.filter((a) => a.channel === channel).reverse();
      return {
        leadId: l.id, name: l.name, phone: l.phone, email: l.email, channel, lead: l,
        messages: msgs.map((a) => ({ from: a.inbound ? ("lead" as const) : ("agent" as const), text: a.text, at: a.when })),
      };
    }).filter((t) => t.messages.length),
  );
  return threads.sort((a, b) => b.messages.at(-1)!.at.localeCompare(a.messages.at(-1)!.at));
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
