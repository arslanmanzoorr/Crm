"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as mock from "./data";
import { dbEnabled, supabase } from "./db";

export type FormState = { error?: string; ok?: string } | undefined;

const NO_DB = { error: "Connect Supabase first (see web/README.md). Demo data is read-only." };
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const list = (f: FormData, k: string) => str(f, k).split(",").map((s) => s.trim()).filter(Boolean);
const num = (f: FormData, k: string) => Number(str(f, k) || 0);

/** Every mutation re-checks the session itself; RLS is the second wall. */
async function authed() {
  const db = await supabase();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  return db;
}

/** Login form: the clicked button's `mode` picks sign-in or sign-up. */
export async function authenticate(_: FormState, f: FormData): Promise<FormState> {
  if (!dbEnabled) return NO_DB;
  const db = await supabase();
  const creds = { email: str(f, "email"), password: str(f, "password") };
  if (f.get("mode") !== "signup") {
    const { error } = await db.auth.signInWithPassword(creds);
    if (error) return { error: error.message };
    redirect("/");
  }
  const origin = (await headers()).get("origin") ?? "";
  const { data, error } = await db.auth.signUp({ ...creds, options: { emailRedirectTo: `${origin}/auth/callback` } });
  if (error) return { error: error.message };
  if (data.session) redirect("/");
  return { ok: "Check your email for a confirmation link." };
}

export async function signOut() {
  if (dbEnabled) await (await supabase()).auth.signOut();
  redirect("/login");
}

export async function createLead(_: FormState, f: FormData): Promise<FormState> {
  if (!dbEnabled) return NO_DB;
  const db = await authed();
  const { data, error } = await db.from("contacts").insert({
    name: str(f, "name"),
    type: str(f, "type") || "buyer",
    email: str(f, "email") || null,
    phone: str(f, "phone") || null,
    sources: list(f, "sources"),
    budget: str(f, "budget"),
    areas: list(f, "areas"),
    preferences: list(f, "preferences"),
    consent_sms: f.get("consent_sms") === "on",
    consent_call: f.get("consent_call") === "on",
    consent_email: f.get("consent_email") === "on",
  }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect(`/leads/${data.id}`);
}

export async function createProperty(_: FormState, f: FormData): Promise<FormState> {
  if (!dbEnabled) return NO_DB;
  const db = await authed();
  const { data, error } = await db.from("properties").insert({
    address: str(f, "address"),
    area: str(f, "area"),
    price: num(f, "price"),
    beds: num(f, "beds"),
    baths: num(f, "baths"),
    sqft: num(f, "sqft"),
    status: str(f, "status") || "Active",
    features: list(f, "features"),
    description: str(f, "description"),
  }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect(`/properties/${data.id}`);
}

export async function addActivity(_: FormState, f: FormData): Promise<FormState> {
  if (!dbEnabled) return NO_DB;
  const content = str(f, "content");
  if (!content) return { error: "Write something first." };
  const db = await authed();
  const contact_id = str(f, "contact_id");
  const { error } = await db.from("activities").insert({ contact_id, channel: str(f, "channel") || "Note", content });
  if (error) return { error: error.message };
  revalidatePath(`/leads/${contact_id}`);
  return { ok: "Saved" };
}

/** Copies the demo leads and listings into the signed-in user's org so the app isn't empty on day one. */
export async function loadDemo(): Promise<void> {
  if (!dbEnabled) return;
  const db = await authed();
  const { data: contacts, error } = await db.from("contacts").insert(
    mock.leads.map((l) => ({
      name: l.name, email: l.email, phone: l.phone, sources: l.sources, score: l.score, intent: l.intent,
      budget: l.budget, areas: l.areas, preferences: l.preferences,
      type: l.headline.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "") || "buyer",
    })),
  ).select("id,name");
  if (error) throw new Error(error.message);
  const idByName = new Map(contacts.map((c) => [c.name, c.id]));
  await db.from("activities").insert(
    mock.leads.flatMap((l) => l.activity.map((a) => ({ contact_id: idByName.get(l.name), channel: a.channel, content: a.text }))),
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  await db.from("properties").insert(mock.properties.map(({ id: _id, tone: _t, ...p }) => p));
  revalidatePath("/", "layout");
}
