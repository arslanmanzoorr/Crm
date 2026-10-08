// Server-side data access. Uses Supabase when its env vars are set, else the mock data in ./data.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import * as mock from "./data";
import type { Channel, Lead, Property } from "./data";

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

type ActivityRow = { channel: Channel; content: string; ts: string };
type ContactRow = {
  id: string; type: string; name: string; email: string | null; phone: string | null; sources: string[];
  score: number; intent: string; budget: string; areas: string[]; preferences: string[]; activities: ActivityRow[];
};

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const when = (ts: string) => new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

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
    activity: activity.map((a) => ({ when: when(a.ts), channel: a.channel, text: a.content })),
  };
}

const TONES = mock.properties.map((p) => p.tone);
const toProperty = (r: Omit<Property, "tone" | "price" | "baths"> & { price: number | string; baths: number | string }, i: number): Property =>
  ({ ...r, price: Number(r.price), baths: Number(r.baths), tone: TONES[i % TONES.length] });

const CONTACT_COLS = "id,type,name,email,phone,sources,score,intent,budget,areas,preferences,activities(channel,content,ts)";
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
