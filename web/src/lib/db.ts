// Server-side data access. Uses Supabase when its env vars are set, else the mock data in ./data.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import * as mock from "./data";
import { likeSafe } from "./search";
import type { Side } from "./deals";
import type { Contingency, Financing, OfferTerms } from "./offers";
import { BUYING_TYPES } from "./match";
import type { PastClient } from "./retention";
import type { Step, Trigger } from "./playbooks";
import type { Comp, Home, NetInputs, Rates } from "./cma";
import type { Doc, Financing as BuyerFinancing, LoanStage } from "./readiness";
export { likeSafe };
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
  score: number; owner_id: string | null; tags: string[]; created_at: string; first_response_at: string | null; consent_sms: boolean; consent_call: boolean; consent_email: boolean; dnc: boolean; intent: string; budget: string; areas: string[]; preferences: string[]; activities: ActivityRow[];
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
    ownerId: r.owner_id,
    tags: r.tags,
    createdAt: r.created_at,
    firstResponseAt: r.first_response_at,
  };
}

const TONES = mock.properties.map((p) => p.tone);
// Placeholder gradient keyed to the listing id, so it's the same on every page.
const toneFor = (id: string) => TONES[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
const toProperty = ({ showing_notes, seller_id, created_at, listing_expires, ...r }: Omit<Property, "tone" | "price" | "baths"> & { price: number | string; baths: number | string; showing_notes?: string; seller_id?: string | null; created_at?: string; listing_expires?: string | null }): Property =>
  ({ ...r, price: Number(r.price), baths: Number(r.baths), tone: toneFor(r.id), showingNotes: showing_notes ?? "", sellerId: seller_id ?? null, createdAt: created_at, listingExpires: listing_expires ?? null });

const CONTACT_COLS = "id,type,stage,next_action,name,email,phone,sources,score,owner_id,tags,created_at,first_response_at,consent_sms,consent_call,consent_email,dnc,intent,budget,areas,preferences,activities(channel,content,ts,direction)";
const PROPERTY_COLS = "id,address,area,price,beds,baths,sqft,status,features,description,showing_notes,seller_id,created_at,listing_expires";

function must<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export type Temp = "Hot" | "Warm" | "Cold";
export const PAGE = 30;
const TEMP_RANGE: Record<Temp, [number, number]> = { Hot: [80, 100], Warm: [50, 79], Cold: [0, 49] };


/**
 * One page of leads with only their latest activity. Search and filters run in Postgres
 * (trigram index on contacts.search), so this stays fast at any list size.
 */
export async function listLeads({ q = "", temp, limit = PAGE, owner, tag }: { q?: string; temp?: Temp; limit?: number; owner?: string; tag?: string }) {
  if (!dbEnabled) {
    const all = mock.leads.filter((l) => `${l.name} ${l.headline}`.toLowerCase().includes(q.toLowerCase()));
    return { leads: all, total: all.length, counts: { All: all.length, Hot: 0, Warm: 0, Cold: 0 } };
  }
  const db = await supabase();
  const term = likeSafe(q);
  const base = () => {
    let b = db.from("contacts").select("id", { count: "exact", head: true });
    if (term) b = b.ilike("search", `%${term}%`);
    if (owner) b = owner === "none" ? b.is("owner_id", null) : b.eq("owner_id", owner);
    if (tag) b = b.contains("tags", [tag]);
    return b;
  };
  let query = db.from("contacts").select(CONTACT_COLS, { count: "exact" })
    .order("ts", { referencedTable: "activities", ascending: false }).limit(1, { referencedTable: "activities" });
  if (term) query = query.ilike("search", `%${term}%`);
  if (temp) query = query.gte("score", TEMP_RANGE[temp][0]).lte("score", TEMP_RANGE[temp][1]);
  if (owner) query = owner === "none" ? query.is("owner_id", null) : query.eq("owner_id", owner);
  if (tag) query = query.contains("tags", [tag]);
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

export type Buyer = { id: string; name: string; type: string; budget: string; areas: string[]; preferences: string[]; score: number };

/** Open buyers, investors and renters, for ranking against a listing (src/lib/match.ts). */
export async function getOpenBuyers(): Promise<Buyer[]> {
  if (!dbEnabled) return mock.leads.map((l) => ({ id: l.id, name: l.name, type: l.type ?? "buyer", budget: l.budget, areas: l.areas, preferences: l.preferences, score: l.score }));
  // ponytail: ranks up to 1000 open buyers in JS; move matching into SQL when a team has more
  const res = await (await supabase()).from("contacts").select("id,name,type,budget,areas,preferences,score")
    .in("type", BUYING_TYPES).not("stage", "in", "(Closed,Lost)").order("score", { ascending: false }).limit(1000);
  return must(res) as Buyer[];
}

type PropertyRow = Parameters<typeof toProperty>[0] & { property_media: { id: string; path: string }[] };
const PHOTO_TTL = 60 * 60; // signed photo URLs last an hour; pages re-sign on every render

/** Signs many storage paths in one request; returns path -> URL. */
async function signPhotos(db: Awaited<ReturnType<typeof supabase>>, paths: string[]) {
  if (!paths.length) return new Map<string, string>();
  const { data } = await db.storage.from("listing-photos").createSignedUrls(paths, PHOTO_TTL);
  return new Map((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
}

/** All listings with their cover photo. ponytail: first 200 by age; add paging like leads past that. */
export async function getProperties(): Promise<Property[]> {
  if (!dbEnabled) return mock.properties;
  const db = await supabase();
  const rows = must(await db.from("properties").select(`${PROPERTY_COLS},property_media(id,path)`)
    .order("position", { referencedTable: "property_media" }).limit(1, { referencedTable: "property_media" })
    .order("created_at").limit(200)) as PropertyRow[];
  // Cards use the 800px thumbnail written next to each photo at upload.
  const thumb = (path: string) => path.replace(/\.webp$/, ".thumb.webp");
  const urls = await signPhotos(db, rows.flatMap((r) => r.property_media.map((m) => thumb(m.path))));
  return rows.map(({ property_media, ...r }) => ({ ...toProperty(r), cover: property_media[0] && urls.get(thumb(property_media[0].path)) }));
}

/** One listing with its full ordered gallery. */
export async function getProperty(id: string): Promise<Property | undefined> {
  if (!dbEnabled) return mock.propertyById(id);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  const db = await supabase();
  const { data } = await db.from("properties").select(`${PROPERTY_COLS},property_media(id,path)`)
    .order("position", { referencedTable: "property_media" }).eq("id", id).maybeSingle();
  if (!data) return undefined;
  const { property_media, ...r } = data as PropertyRow;
  const urls = await signPhotos(db, property_media.map((m) => m.path));
  const photos = property_media.flatMap((m) => (urls.get(m.path) ? [{ id: m.id, url: urls.get(m.path)! }] : []));
  return { ...toProperty(r), cover: photos[0]?.url, photos };
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

export type BoardCard = { id: string; name: string; type: string; budget: string; score: number; stage: Stage; lastActivityAt: string | null };
export type BoardColumn = { stage: Stage; count: number; cards: BoardCard[] };

/** Pipeline: up to 50 leads per stage (highest score first) plus each stage's true count. */
export async function getPipeline(): Promise<BoardColumn[]> {
  if (!dbEnabled)
    return mock.STAGES.map((stage) => {
      const cards = stage === "New" ? mock.leads.map((l) => ({ id: l.id, name: l.name, type: l.type ?? "buyer", budget: l.budget, score: l.score, stage, lastActivityAt: null })) : [];
      return { stage, count: cards.length, cards };
    });
  const db = await supabase();
  return Promise.all(mock.STAGES.map(async (stage) => {
    const res = await db.from("contacts").select("id,name,type,budget,score,stage,last_activity_at", { count: "exact" })
      .eq("stage", stage).order("score", { ascending: false }).order("id").limit(50);
    const rows = must(res) as { id: string; name: string; type: string; budget: string; score: number; stage: Stage; last_activity_at: string | null }[];
    return {
      stage,
      count: res.count ?? rows.length,
      cards: rows.map((r) => ({ id: r.id, name: r.name, type: r.type, budget: r.budget, score: r.score, stage: r.stage, lastActivityAt: r.last_activity_at })),
    };
  }));
}

/** The org's public lead form (one per org for now). */
export async function getLeadForm(): Promise<{ id: string; public_name: string | null; enabled: boolean } | null> {
  if (!dbEnabled) return null;
  const { data } = await (await supabase()).from("lead_forms").select("id,public_name,enabled").order("created_at").limit(1).maybeSingle();
  return data;
}

export type Role = "owner" | "admin" | "agent" | "assistant";
export type Team = {
  me: { userId: string; role: Role };
  org: { id: string; name: string };
  orgs: { id: string; name: string }[];
  members: { userId: string; email: string; role: Role; joined: string }[];
  invites: { id: string; email: string; role: Role; expires: string }[];
};

/** The active org, its members, pending invites (admins only) and every org the user belongs to. */
export async function getTeam(): Promise<Team | null> {
  if (!dbEnabled) return null;
  const db = await supabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;
  const [active, mine] = await Promise.all([
    db.rpc("active_org"),
    db.from("memberships").select("org_id,role,organizations(name)").eq("user_id", auth.user.id),
  ]);
  const orgId = active.data as string | null;
  if (!orgId) return null;
  type Mine = { org_id: string; role: Role; organizations: { name: string } | null };
  const orgs = ((mine.data ?? []) as unknown as Mine[]).map((m) => ({ id: m.org_id, name: m.organizations?.name ?? "Team", role: m.role }));
  const current = orgs.find((o) => o.id === orgId)!;
  const isAdmin = current.role === "owner" || current.role === "admin";
  const [members, invites] = await Promise.all([
    db.from("memberships").select("user_id,email,role,created_at").eq("org_id", orgId).order("created_at"),
    isAdmin ? db.from("invites").select("id,email,role,expires_at").is("accepted_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }) : { data: [] },
  ]);
  return {
    me: { userId: auth.user.id, role: current.role },
    org: { id: orgId, name: current.name },
    orgs: orgs.map(({ id, name }) => ({ id, name })),
    members: (members.data ?? []).map((m) => ({ userId: m.user_id, email: m.email ?? "", role: m.role as Role, joined: m.created_at })),
    invites: (invites.data ?? []).map((i) => ({ id: i.id, email: i.email, role: i.role as Role, expires: i.expires_at })),
  };
}

export type Member = { userId: string; email: string; role: Role; inRotation: boolean };

/** Members of the active org (for owner pickers and routing settings). */
export async function getMembers(): Promise<{ me: string; members: Member[]; routing: "off" | "round_robin" }> {
  if (!dbEnabled) return { me: "", members: [], routing: "off" };
  const db = await supabase();
  const [{ data: auth }, org] = await Promise.all([db.auth.getUser(), db.rpc("active_org")]);
  const [members, orgRow] = await Promise.all([
    db.from("memberships").select("user_id,email,role,in_rotation").eq("org_id", org.data).order("created_at"),
    db.from("organizations").select("routing").eq("id", org.data).single(),
  ]);
  return {
    me: auth.user?.id ?? "",
    members: (members.data ?? []).map((m) => ({ userId: m.user_id, email: m.email ?? "", role: m.role as Role, inRotation: m.in_rotation })),
    routing: (orgRow.data?.routing ?? "off") as "off" | "round_robin",
  };
}

export type OpenHouse = {
  id: string; startsAt: string; endsAt: string;
  visits: { contactId: string; name: string; hasAgent: boolean; rating: number | null; feedback: string; ts: string }[];
};

/** A listing's open houses, newest first, with who signed in and what they thought (the seller report). */
export async function getOpenHouses(propertyId: string): Promise<OpenHouse[]> {
  if (!dbEnabled) return [];
  type Row = { id: string; starts_at: string; ends_at: string; open_house_visits: { contact_id: string; has_agent: boolean; rating: number | null; feedback: string; ts: string; contacts: { name: string } | null }[] };
  const res = await (await supabase()).from("open_houses")
    .select("id,starts_at,ends_at,open_house_visits(contact_id,has_agent,rating,feedback,ts,contacts(name))")
    .eq("property_id", propertyId).order("starts_at", { ascending: false }).limit(50);
  return (must(res) as unknown as Row[]).map((o) => ({
    id: o.id, startsAt: o.starts_at, endsAt: o.ends_at,
    visits: o.open_house_visits.sort((a, b) => a.ts.localeCompare(b.ts)).map((v) => ({
      contactId: v.contact_id, name: v.contacts?.name ?? "Deleted lead", hasAgent: v.has_agent, rating: v.rating, feedback: v.feedback, ts: v.ts,
    })),
  }));
}

export type DealMilestone = { id: string; title: string; dueOn: string | null; doneAt: string | null };
export type Deal = {
  id: string; side: Side; status: "active" | "closed" | "fell_through"; payoutStatus: "pending" | "approved" | "paid"; payoutAt: string | null; price: number; address: string;
  acceptedOn: string; closeOn: string | null; closedAt: string | null; notes: string;
  commissionPct: number; agentSplitPct: number; referralPct: number; ownerId: string | null;
  contact: { id: string; name: string; lastActivityAt: string | null };
  property: { id: string; address: string } | null;
  milestones: DealMilestone[];
};
type DealRow = {
  id: string; side: Side; status: Deal["status"]; payout_status: Deal["payoutStatus"]; payout_at: string | null; price: number | string; address: string; accepted_on: string; close_on: string | null;
  closed_at: string | null; notes: string; commission_pct: number | string; agent_split_pct: number | string; referral_pct: number | string; owner_id: string | null;
  contacts: { id: string; name: string; last_activity_at: string | null } | null;
  properties: { id: string; address: string } | null;
  deal_milestones: { id: string; title: string; due_on: string | null; done_at: string | null; position: number }[];
};
const DEAL_COLS = "id,side,status,payout_status,payout_at,price,address,accepted_on,close_on,closed_at,notes,commission_pct,agent_split_pct,referral_pct,owner_id,contacts(id,name,last_activity_at),properties(id,address),deal_milestones(id,title,due_on,done_at,position)";

const toDeal = (r: DealRow): Deal => ({
  id: r.id, side: r.side, status: r.status, payoutStatus: r.payout_status, payoutAt: r.payout_at, price: Number(r.price), acceptedOn: r.accepted_on, closeOn: r.close_on, closedAt: r.closed_at,
  address: r.properties?.address || r.address, notes: r.notes, ownerId: r.owner_id,
  commissionPct: Number(r.commission_pct), agentSplitPct: Number(r.agent_split_pct), referralPct: Number(r.referral_pct),
  contact: { id: r.contacts?.id ?? "", name: r.contacts?.name ?? "Deleted lead", lastActivityAt: r.contacts?.last_activity_at ?? null },
  property: r.properties,
  milestones: [...r.deal_milestones]
    .sort((a, b) => (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999") || a.position - b.position)
    .map((m) => ({ id: m.id, title: m.title, dueOn: m.due_on, doneAt: m.done_at })),
});

/** Active deals plus everything closed this calendar year (for earnings), soonest closing first. */
export async function listDeals(): Promise<Deal[]> {
  if (!dbEnabled) return [];
  const db = await supabase(); // first: marks the request dynamic before the clock is read
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const res = await db.from("deals").select(DEAL_COLS)
    .or(`status.eq.active,closed_at.gte.${yearStart}`)
    .order("close_on", { ascending: true, nullsFirst: false }).limit(500);
  return (must(res) as unknown as DealRow[]).map(toDeal);
}

export async function getDeal(id: string): Promise<Deal | undefined> {
  if (!dbEnabled || !/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  const { data } = await (await supabase()).from("deals").select(DEAL_COLS).eq("id", id).maybeSingle();
  return data ? toDeal(data as unknown as DealRow) : undefined;
}

/** A client's deals, for the lead page. */
export async function getDealsFor(contactId: string): Promise<Deal[]> {
  if (!dbEnabled) return [];
  const res = await (await supabase()).from("deals").select(DEAL_COLS).eq("contact_id", contactId).order("created_at", { ascending: false });
  return (must(res) as unknown as DealRow[]).map(toDeal);
}

export type OfferEvent = { kind: string; amount: number | null; note: string; ts: string };
export type Offer = OfferTerms & {
  side: Side; address: string; buyerName: string; downPct: number | null; expiresAt: string | null; notes: string; dealId: string | null; createdAt: string;
  property: { id: string; address: string } | null; contact: { id: string; name: string } | null; events: OfferEvent[];
};
type OfferRow = {
  id: string; side: Side; amount: string | number; earnest: string | number; seller_credit: string | number; financing: Financing; contingencies: Contingency[];
  close_on: string | null; status: string; address: string; buyer_name: string; down_pct: string | number | null; expires_at: string | null; notes: string;
  deal_id: string | null; created_at: string; properties: { id: string; address: string } | null; contacts: { id: string; name: string } | null;
  offer_events: { kind: string; amount: string | number | null; note: string; ts: string }[];
};
const OFFER_COLS = "id,side,amount,earnest,seller_credit,financing,contingencies,close_on,status,address,buyer_name,down_pct,expires_at,notes,deal_id,created_at,properties(id,address),contacts(id,name),offer_events(kind,amount,note,ts)";
const toOffer = (r: OfferRow): Offer => ({
  id: r.id, side: r.side, amount: Number(r.amount), earnest: Number(r.earnest), sellerCredit: Number(r.seller_credit), financing: r.financing,
  contingencies: r.contingencies, closeOn: r.close_on, status: r.status, address: r.properties?.address || r.address, buyerName: r.buyer_name,
  downPct: r.down_pct === null ? null : Number(r.down_pct), expiresAt: r.expires_at, notes: r.notes, dealId: r.deal_id, createdAt: r.created_at,
  property: r.properties, contact: r.contacts,
  events: [...r.offer_events].sort((a, b) => a.ts.localeCompare(b.ts)).map((e) => ({ kind: e.kind, amount: e.amount === null ? null : Number(e.amount), note: e.note, ts: e.ts })),
});

/** Offers on a listing, or made by a buyer client. Newest first. */
export async function getOffers(by: { propertyId?: string; contactId?: string }): Promise<Offer[]> {
  if (!dbEnabled) return [];
  let q = (await supabase()).from("offers").select(OFFER_COLS);
  if (by.propertyId) q = q.eq("property_id", by.propertyId);
  if (by.contactId) q = q.eq("contact_id", by.contactId);
  const res = await q.order("created_at", { ascending: false }).limit(100);
  return (must(res) as unknown as OfferRow[]).map(toOffer);
}

export async function getOffer(id: string): Promise<Offer | undefined> {
  if (!dbEnabled || !/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  const { data } = await (await supabase()).from("offers").select(OFFER_COLS).eq("id", id).maybeSingle();
  return data ? toOffer(data as unknown as OfferRow) : undefined;
}

type Money = { month: string; deals: number; gci: number; agent: number };
export type Analytics = {
  days: number; leads: number;
  by_source: { source: string; leads: number; reached: number; qualified: number; contracted: number; closed: number; median_response_min: number | null; spend: number }[];
  response: { median_min: number | null; within_5m: number; within_1h: number; responded: number; never: number };
  cycle: { deals: number; lead_to_contract_days: number | null; contract_to_close_days: number | null };
  revenue: Money[]; forecast: Money[];
  agents: { user_id: string; email: string; role: string; leads: number; median_response_min: number | null; touches: number; active_deals: number; closed: number; closed_agent: number }[];
  listings: { id: string; address: string; status: string; price: number; days_on_market: number; visitors: number; showings: number; offers: number; best_offer: number | null }[];
};

/** Team analytics for the last `days` days (one RPC; aggregation runs in Postgres under the caller's RLS). */
export async function getAnalytics(days: number): Promise<Analytics | null> {
  if (!dbEnabled) return null;
  const { data, error } = await (await supabase()).rpc("team_analytics", { p_days: days });
  if (error) throw new Error(error.message);
  return data as Analytics;
}

export type Testimonial = { id: string; contactId: string; name: string; body: string; rating: number | null; publishOk: boolean; receivedOn: string };

/** Everyone we've closed a deal with (latest closing per client), plus referrals and testimonials. */
export async function getPastClients(): Promise<{ clients: PastClient[]; referrals: Record<string, number>; testimonials: Testimonial[]; reviewUrl: string | null; isAdmin: boolean }> {
  if (!dbEnabled) return { clients: [], referrals: {}, testimonials: [], reviewUrl: null, isAdmin: false };
  const db = await supabase();
  type Row = { id: string; side: "buyer" | "seller"; address: string; close_on: string | null; closed_at: string; review_asked_at: string | null; properties: { address: string } | null; contacts: { id: string; name: string; last_activity_at: string | null } | null };
  const [closed, active, refs, notes, auth, org] = await Promise.all([
    db.from("deals").select("id,side,address,close_on,closed_at,review_asked_at,properties(address),contacts(id,name,last_activity_at)")
      .eq("status", "closed").order("closed_at", { ascending: false }).limit(2000),
    db.from("deals").select("contact_id").eq("status", "active"),
    // ponytail: counts referrals in JS; a grouped RPC once a team has tens of thousands of contacts
    db.from("contacts").select("referred_by").not("referred_by", "is", null).limit(10000),
    db.from("testimonials").select("id,contact_id,body,rating,publish_ok,received_on,contacts(name)").order("received_on", { ascending: false }).limit(200),
    db.auth.getUser(),
    db.rpc("active_org"),
  ]);
  const activeIds = new Set((active.data ?? []).map((d) => d.contact_id));
  const referrals: Record<string, number> = {};
  for (const r of refs.data ?? []) referrals[r.referred_by] = (referrals[r.referred_by] ?? 0) + 1;
  type TRow = { id: string; contact_id: string; body: string; rating: number | null; publish_ok: boolean; received_on: string; contacts: { name: string } | null };
  const testimonials = ((notes.data ?? []) as unknown as TRow[]).map((t) => ({ id: t.id, contactId: t.contact_id, name: t.contacts?.name ?? "", body: t.body, rating: t.rating, publishOk: t.publish_ok, receivedOn: t.received_on }));
  const withTestimonial = new Set(testimonials.map((t) => t.contactId));
  const seen = new Set<string>();
  const clients: PastClient[] = [];
  for (const d of (must(closed) as unknown as Row[])) {
    if (!d.contacts || seen.has(d.contacts.id)) continue; // newest closing per client
    seen.add(d.contacts.id);
    clients.push({
      contactId: d.contacts.id, name: d.contacts.name, dealId: d.id, side: d.side, address: d.properties?.address || d.address,
      closedOn: d.close_on ?? d.closed_at.slice(0, 10), lastTouchOn: d.contacts.last_activity_at?.slice(0, 10) ?? null,
      reviewAskedOn: d.review_asked_at?.slice(0, 10) ?? null, hasTestimonial: withTestimonial.has(d.contacts.id), activeDeal: activeIds.has(d.contacts.id),
    });
  }
  const [orgRow, me] = await Promise.all([
    db.from("organizations").select("review_url").eq("id", org.data).maybeSingle(),
    db.from("memberships").select("role").eq("org_id", org.data).eq("user_id", auth.data.user?.id ?? "").maybeSingle(),
  ]);
  return { clients, referrals, testimonials, reviewUrl: orgRow.data?.review_url ?? null, isAdmin: ["owner", "admin"].includes(me.data?.role ?? "") };
}

/** Who referred this lead, and whom they've referred. */
export async function getReferrals(contactId: string): Promise<{ referredBy: { id: string; name: string } | null; referred: { id: string; name: string }[] }> {
  if (!dbEnabled) return { referredBy: null, referred: [] };
  const db = await supabase();
  const [me, theirs] = await Promise.all([
    db.from("contacts").select("referred_by").eq("id", contactId).maybeSingle(),
    db.from("contacts").select("id,name").eq("referred_by", contactId).order("created_at").limit(100),
  ]);
  const by = me.data?.referred_by ? (await db.from("contacts").select("id,name").eq("id", me.data.referred_by).maybeSingle()).data : null;
  return { referredBy: by, referred: theirs.data ?? [] };
}

export type Showing = {
  id: string; startsAt: string; endsAt: string; status: "requested" | "confirmed" | "done" | "cancelled" | "no_show";
  interest: "not_interested" | "maybe" | "interested" | "offer" | null; rating: number | null; feedback: string; notes: string; agentId: string | null;
  address: string; showingNotes: string; property: { id: string; price: number } | null;
  contact: { id: string; name: string; phone: string; email: string };
};
type ShowingRow = {
  id: string; starts_at: string; ends_at: string; status: Showing["status"]; interest: Showing["interest"]; rating: number | null; feedback: string; notes: string;
  agent_id: string | null; address: string; properties: { id: string; address: string; price: number | string; showing_notes: string } | null;
  contacts: { id: string; name: string; phone: string | null; email: string | null } | null;
};
const SHOWING_COLS = "id,starts_at,ends_at,status,interest,rating,feedback,notes,agent_id,address,properties(id,address,price,showing_notes),contacts(id,name,phone,email)";
const toShowing = (r: ShowingRow): Showing => ({
  id: r.id, startsAt: r.starts_at, endsAt: r.ends_at, status: r.status, interest: r.interest, rating: r.rating, feedback: r.feedback, notes: r.notes, agentId: r.agent_id,
  address: r.properties?.address || r.address, showingNotes: r.properties?.showing_notes ?? "",
  property: r.properties ? { id: r.properties.id, price: Number(r.properties.price) } : null,
  contact: { id: r.contacts?.id ?? "", name: r.contacts?.name ?? "Deleted lead", phone: r.contacts?.phone ?? "", email: r.contacts?.email ?? "" },
});

/** Showings by time window, buyer or listing. Ordered by start time. */
export async function getShowings(by: { from?: string; to?: string; contactId?: string; propertyId?: string }): Promise<Showing[]> {
  if (!dbEnabled) return [];
  let q = (await supabase()).from("showings").select(SHOWING_COLS);
  if (by.from) q = q.gte("starts_at", by.from);
  if (by.to) q = q.lt("starts_at", by.to);
  if (by.contactId) q = q.eq("contact_id", by.contactId);
  if (by.propertyId) q = q.eq("property_id", by.propertyId);
  const res = await q.order("starts_at").limit(500);
  return (must(res) as unknown as ShowingRow[]).map(toShowing);
}

export async function getShowing(id: string): Promise<Showing | undefined> {
  if (!dbEnabled || !/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  const { data } = await (await supabase()).from("showings").select(SHOWING_COLS).eq("id", id).maybeSingle();
  return data ? toShowing(data as unknown as ShowingRow) : undefined;
}

export type Partner = { id: string; kind: string; name: string; company: string; email: string; phone: string; notes: string; clients: number };

/** Referral partners, with how many clients use each (lenders, via financing). */
export async function getPartners(): Promise<Partner[]> {
  if (!dbEnabled) return [];
  const db = await supabase();
  const [rows, fin] = await Promise.all([
    db.from("partners").select("id,kind,name,company,email,phone,notes").order("kind").order("name").limit(1000),
    db.from("financing").select("lender_id").not("lender_id", "is", null).limit(10000),
  ]);
  const used: Record<string, number> = {};
  for (const f of fin.data ?? []) used[f.lender_id] = (used[f.lender_id] ?? 0) + 1;
  return (must(rows) as Omit<Partner, "clients">[]).map((p) => ({ ...p, email: p.email ?? "", phone: p.phone ?? "", clients: used[p.id] ?? 0 }));
}

export type FinancingRecord = BuyerFinancing & { lenderId: string | null; lenderPhone: string; lenderEmail: string };

export async function getFinancing(contactId: string): Promise<FinancingRecord | null> {
  if (!dbEnabled) return null;
  const { data } = await (await supabase()).from("financing")
    .select("cash,lender_id,stage,preapproval_amount,preapproval_expires,docs,gift_funds,partners(name,company,phone,email)")
    .eq("contact_id", contactId).maybeSingle();
  if (!data) return null;
  const p = data.partners as unknown as { name: string; company: string; phone: string | null; email: string | null } | null;
  return {
    cash: data.cash, lenderId: data.lender_id, lender: p ? [p.name, p.company].filter(Boolean).join(", ") : null, lenderPhone: p?.phone ?? "", lenderEmail: p?.email ?? "",
    stage: data.stage as LoanStage, preapprovalAmount: data.preapproval_amount === null ? null : Number(data.preapproval_amount),
    preapprovalExpires: data.preapproval_expires, docs: data.docs as Doc[], giftFunds: data.gift_funds,
  };
}

export type PortalLinkInfo = { createdAt: string; lastSeenAt: string | null; expiresAt: string } | null;

/** The client's live portal link, if any (the token itself is never stored). */
export async function getPortalLink(contactId: string): Promise<PortalLinkInfo> {
  if (!dbEnabled) return null;
  const { data } = await (await supabase()).from("portal_links").select("created_at,last_seen_at,expires_at")
    .eq("contact_id", contactId).is("revoked_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data ? { createdAt: data.created_at, lastSeenAt: data.last_seen_at, expiresAt: data.expires_at } : null;
}

export type Workflow = {
  id: string; name: string; trigger: Trigger; conditions: Record<string, string>; steps: Step[]; stopStages: string[]; enabled: boolean; template: string | null;
  counts: { pending: number; done: number; skipped: number; failed: number };
};
export type FailedRun = { id: number; workflow: string; contactId: string; contact: string; error: string; at: string };

/** Playbooks with how many steps are waiting, done, stopped and failed; plus the latest failures. */
export async function getWorkflows(): Promise<{ workflows: Workflow[]; failed: FailedRun[]; isAdmin: boolean }> {
  if (!dbEnabled) return { workflows: [], failed: [], isAdmin: false };
  const db = await supabase();
  const [w, runs, failed, auth, org] = await Promise.all([
    db.from("workflows").select("id,name,trigger,conditions,steps,stop_stages,enabled,template").order("created_at"),
    // ponytail: counts in JS from up to 20k run rows; a grouped view when teams run more
    db.from("workflow_runs").select("workflow_id,status").limit(20000),
    db.from("workflow_runs").select("id,last_error,done_at,due_at,workflows(name),contacts(id,name)").eq("status", "failed").order("id", { ascending: false }).limit(20),
    db.auth.getUser(),
    db.rpc("active_org"),
  ]);
  const counts: Record<string, Workflow["counts"]> = {};
  for (const r of runs.data ?? []) {
    const c = (counts[r.workflow_id] ??= { pending: 0, done: 0, skipped: 0, failed: 0 });
    c[r.status as keyof Workflow["counts"]]++;
  }
  const me = await db.from("memberships").select("role").eq("org_id", org.data).eq("user_id", auth.data.user?.id ?? "").maybeSingle();
  type F = { id: number; last_error: string | null; done_at: string | null; due_at: string; workflows: { name: string } | null; contacts: { id: string; name: string } | null };
  return {
    workflows: (must(w) as { id: string; name: string; trigger: Trigger; conditions: Record<string, string>; steps: Step[]; stop_stages: string[]; enabled: boolean; template: string | null }[])
      .map((x) => ({ ...x, stopStages: x.stop_stages, counts: counts[x.id] ?? { pending: 0, done: 0, skipped: 0, failed: 0 } })),
    failed: ((failed.data ?? []) as unknown as F[]).map((f) => ({ id: f.id, workflow: f.workflows?.name ?? "", contactId: f.contacts?.id ?? "", contact: f.contacts?.name ?? "", error: f.last_error ?? "", at: f.done_at ?? f.due_at })),
    isAdmin: ["owner", "admin"].includes(me.data?.role ?? ""),
  };
}

/** Areas and who owns them. */
export async function getTerritories(): Promise<{ area: string; userId: string }[]> {
  if (!dbEnabled) return [];
  const res = await (await supabase()).from("territories").select("area,user_id").order("area_key");
  return (must(res) as { area: string; user_id: string }[]).map((t) => ({ area: t.area, userId: t.user_id }));
}

export type Signal = { contactId: string; name: string; ownerId: string | null; signal: string; strength: number; at: string };

/** Fresh buying signals for the team, or for one lead. */
export async function getBuyingSignals(contactId?: string): Promise<Signal[]> {
  if (!dbEnabled) return [];
  const { data, error } = await (await supabase()).rpc("buying_signals", contactId ? { p_contact: contactId } : {});
  if (error) throw new Error(error.message);
  return ((data ?? []) as { contact_id: string; name: string; owner_id: string | null; signal: string; strength: number; at: string }[])
    .map((s) => ({ contactId: s.contact_id, name: s.name, ownerId: s.owner_id, signal: s.signal, strength: s.strength, at: s.at }));
}

export type Cma = {
  id: string; address: string; propertyId: string | null; contactId: string | null; subject: Home; comps: Comp[]; rates: Rates; net: NetInputs;
  listPrice: number | null; notes: string; updatedAt: string;
};
type CmaRow = { id: string; address: string; property_id: string | null; contact_id: string | null; subject: Home; comps: Comp[]; rates: Rates; net: NetInputs; list_price: number | string | null; notes: string; updated_at: string };
const toCma = (r: CmaRow): Cma => ({ id: r.id, address: r.address, propertyId: r.property_id, contactId: r.contact_id, subject: r.subject, comps: r.comps, rates: r.rates, net: r.net, listPrice: r.list_price === null ? null : Number(r.list_price), notes: r.notes, updatedAt: r.updated_at });

export async function listCmas(): Promise<Cma[]> {
  if (!dbEnabled) return [];
  const res = await (await supabase()).from("cmas").select("id,address,property_id,contact_id,subject,comps,rates,net,list_price,notes,updated_at").order("updated_at", { ascending: false }).limit(200);
  return (must(res) as CmaRow[]).map(toCma);
}

export async function getCma(id: string): Promise<Cma | undefined> {
  if (!dbEnabled || !/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  const { data } = await (await supabase()).from("cmas").select("id,address,property_id,contact_id,subject,comps,rates,net,list_price,notes,updated_at").eq("id", id).maybeSingle();
  return data ? toCma(data as CmaRow) : undefined;
}

export const LINK_KINDS = { household: "Household", family: "Family", friend: "Friend", colleague: "Colleague", other: "Other" } as const;
export type Linked = { id: string; name: string; kind: keyof typeof LINK_KINDS; note: string; stage: string };

/** People related to a lead, from either side of the link. */
export async function getLinks(contactId: string): Promise<Linked[]> {
  if (!dbEnabled) return [];
  type Row = { a: string; b: string; kind: Linked["kind"]; note: string; ca: { id: string; name: string; stage: string } | null; cb: { id: string; name: string; stage: string } | null };
  const res = await (await supabase()).from("contact_links")
    .select("a,b,kind,note,ca:contacts!contact_links_a_org_id_fkey(id,name,stage),cb:contacts!contact_links_b_org_id_fkey(id,name,stage)")
    .or(`a.eq.${contactId},b.eq.${contactId}`);
  return (must(res) as unknown as Row[]).map((r) => {
    const other = r.a === contactId ? r.cb : r.ca;
    return { id: other?.id ?? "", name: other?.name ?? "", kind: r.kind, note: r.note, stage: other?.stage ?? "" };
  }).filter((l) => l.id);
}

export const EXPENSE_CATEGORIES = { marketing: "Marketing", photography: "Photography", staging: "Staging", signage: "Signage", mls_fees: "MLS and dues", client_gifts: "Client gifts", travel: "Travel", other: "Other" } as const;
export type Expense = { id: string; category: keyof typeof EXPENSE_CATEGORIES; source: string | null; amount: number; spentOn: string; vendor: string; note: string; deal: { id: string; address: string } | null };

/** Expenses, newest first: a whole period, or one deal's. */
export async function getExpenses(by: { since?: string; dealId?: string }): Promise<Expense[]> {
  if (!dbEnabled) return [];
  let q = (await supabase()).from("expenses").select("id,category,source,amount,spent_on,vendor,note,deals(id,address)");
  if (by.since) q = q.gte("spent_on", by.since);
  if (by.dealId) q = q.eq("deal_id", by.dealId);
  const res = await q.order("spent_on", { ascending: false }).limit(2000);
  type Row = { id: string; category: Expense["category"]; source: string | null; amount: number | string; spent_on: string; vendor: string; note: string; deals: { id: string; address: string } | null };
  return (must(res) as unknown as Row[]).map((r) => ({ id: r.id, category: r.category, source: r.source, amount: Number(r.amount), spentOn: r.spent_on, vendor: r.vendor, note: r.note, deal: r.deals }));
}

/** Each member's default commission split. */
export async function getSplits(): Promise<Record<string, number>> {
  if (!dbEnabled) return {};
  const db = await supabase();
  const { data: org } = await db.rpc("active_org");
  const { data } = await db.from("memberships").select("user_id,default_split_pct").eq("org_id", org);
  return Object.fromEntries((data ?? []).map((m) => [m.user_id, Number(m.default_split_pct)]));
}

export type PropertyEvent = { kind: "listed" | "price" | "status"; old: string | null; new: string | null; ts: string };

export async function getPropertyHistory(propertyId: string): Promise<PropertyEvent[]> {
  if (!dbEnabled) return [];
  const res = await (await supabase()).from("property_events").select("kind,old_value,new_value,ts").eq("property_id", propertyId).order("ts", { ascending: false }).limit(100);
  return (must(res) as { kind: PropertyEvent["kind"]; old_value: string | null; new_value: string | null; ts: string }[]).map((e) => ({ kind: e.kind, old: e.old_value, new: e.new_value, ts: e.ts }));
}

export type StoredDoc = { id: string; name: string; size: number; mime: string; createdAt: string };

export async function getDocuments(by: { propertyId?: string; dealId?: string; contactId?: string }): Promise<StoredDoc[]> {
  if (!dbEnabled) return [];
  let q = (await supabase()).from("documents").select("id,name,size,mime,created_at");
  if (by.propertyId) q = q.eq("property_id", by.propertyId);
  if (by.dealId) q = q.eq("deal_id", by.dealId);
  if (by.contactId) q = q.eq("contact_id", by.contactId);
  const res = await q.order("created_at", { ascending: false }).limit(200);
  return (must(res) as { id: string; name: string; size: number; mime: string; created_at: string }[]).map((d) => ({ id: d.id, name: d.name, size: Number(d.size), mime: d.mime, createdAt: d.created_at }));
}

export async function getSuppressions(): Promise<{ kind: "email" | "phone"; value: string; reason: string; createdAt: string }[]> {
  if (!dbEnabled) return [];
  const res = await (await supabase()).from("suppressions").select("kind,value,reason,created_at").order("created_at", { ascending: false }).limit(5000);
  return (must(res) as { kind: "email" | "phone"; value: string; reason: string; created_at: string }[]).map((s) => ({ kind: s.kind, value: s.value, reason: s.reason, createdAt: s.created_at }));
}
