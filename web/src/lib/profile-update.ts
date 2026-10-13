// Keep a lead's profile current from what they said, no I/O. The AI proposes changes; this keeps only the ones
// backed by a quote that really appears in the lead's messages and that actually change something.
import { isMoveBy, MOVE_BY } from "./timeline.ts";

export type Profile = { budget: string; areas: string[]; preferences: string[]; moveBy: string | null };
export type Suggestion = { field: keyof Profile; value: string | string[]; quote: string };
export type Change = Suggestion & { label: string; from: string; to: string };

const LABELS: Record<keyof Profile, string> = { budget: "Budget", areas: "Areas", preferences: "Wants", moveBy: "Moving" };
const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
const list = (v: unknown) => (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, 60)).filter(Boolean).slice(0, 10);
const show = (f: keyof Profile, v: string | string[] | null) => (Array.isArray(v) ? v.join(", ") : f === "moveBy" ? (v && isMoveBy(v) ? MOVE_BY[v] : "") : v ?? "") || "—";

export function checkSuggestions(raw: unknown, current: Profile, leadText: string): Change[] {
  const said = norm(leadText);
  const out: Change[] = [];
  for (const s of Array.isArray(raw) ? raw : []) {
    const field = s?.field as keyof Profile;
    if (!(field in LABELS) || out.some((c) => c.field === field)) continue;
    const quote = typeof s.quote === "string" ? s.quote.trim() : "";
    if (quote.length < 4 || !said.includes(norm(quote))) continue; // no evidence in their own words: drop it
    let value: string | string[];
    if (field === "areas" || field === "preferences") {
      value = list(s.value);
      if (!value.length || norm(value.join("|")) === norm(current[field].join("|"))) continue;
    } else if (field === "moveBy") {
      if (!isMoveBy(s.value) || s.value === current.moveBy) continue;
      value = s.value;
    } else {
      const v = typeof s.value === "string" ? s.value.trim().slice(0, 80) : "";
      if (!v || norm(v) === norm(current.budget)) continue;
      value = v;
    }
    out.push({ field, value, quote: quote.slice(0, 200), label: LABELS[field], from: show(field, current[field]), to: show(field, value) });
  }
  return out;
}
