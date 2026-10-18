// Quick update: what the agent said happened, turned into proposed CRM updates. No I/O; the agent confirms.
import { STAGES } from "./data.ts";

export const CHANNELS = ["Call", "SMS", "Email", "WhatsApp", "Instagram"] as const;
export const TASK_KINDS = ["call", "video", "email", "showing", "cma"] as const;

export const QUICK_SCHEMA = {
  type: "object", additionalProperties: false, required: ["actions"],
  properties: {
    actions: {
      type: "array", items: {
        type: "object", additionalProperties: false, required: ["type", "text", "channel", "kind", "date", "time", "stage"],
        properties: {
          type: { type: "string", enum: ["log", "note", "task", "stage"], description: "log = a call/text/email that already happened; note = something to remember; task = a follow-up to do later; stage = the lead moved stage" },
          text: { type: "string", description: "log: one-line summary of what was said; note: the note; task: short task title; stage: empty" },
          channel: { type: "string", description: `log only: one of ${CHANNELS.join(", ")}; else empty` },
          kind: { type: "string", description: `task only: one of ${TASK_KINDS.join(", ")}; else empty` },
          date: { type: "string", description: "task only: YYYY-MM-DD, computed from today's date; else empty" },
          time: { type: "string", description: "task only: HH:MM 24h if a time was said, else empty" },
          stage: { type: "string", description: `stage only: one of ${STAGES.join(", ")}; else empty` },
        },
      },
    },
  },
} as const;

export type QuickAction =
  | { type: "log"; channel: (typeof CHANNELS)[number]; text: string }
  | { type: "note"; text: string }
  | { type: "task"; kind: (typeof TASK_KINDS)[number]; text: string; date: string; time: string }
  | { type: "stage"; stage: (typeof STAGES)[number] };

const s = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const realDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;

/** Only well-formed actions survive: known types and values, task dates from today to a year out, at most 6. */
export function cleanQuick(raw: unknown, today: string): QuickAction[] {
  const list = (raw && typeof raw === "object" && Array.isArray((raw as { actions?: unknown }).actions) ? (raw as { actions: unknown[] }).actions : []);
  const out: QuickAction[] = [];
  for (const a of list) {
    const x = (a ?? {}) as Record<string, unknown>;
    if (x.type === "log") {
      const channel = CHANNELS.find((c) => c.toLowerCase() === s(x.channel, 20).toLowerCase()) ?? "Call";
      const text = s(x.text, 1000);
      if (text) out.push({ type: "log", channel, text });
    } else if (x.type === "note") {
      const text = s(x.text, 1000);
      if (text) out.push({ type: "note", text });
    } else if (x.type === "task") {
      const text = s(x.text, 120), date = s(x.date, 10), time = s(x.time, 5);
      if (!text || !realDate(date) || date < today || date > addDays(today, 365)) continue;
      const kind = TASK_KINDS.find((k) => k === s(x.kind, 10).toLowerCase()) ?? "call";
      out.push({ type: "task", kind, text, date, time: /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "09:00" });
    } else if (x.type === "stage") {
      const stage = STAGES.find((v) => v.toLowerCase() === s(x.stage, 30).toLowerCase());
      if (stage && !out.some((o) => o.type === "stage")) out.push({ type: "stage", stage });
    }
    if (out.length >= 6) break;
  }
  return out;
}
