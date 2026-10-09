// Automated playbooks, no I/O: the trigger catalog, ready-made templates and step validation.
// Steps only ever create tasks or tags; people do the contacting (the approval gate).
import { normTag } from "./search.ts";

export const TRIGGERS = {
  lead_created: "A new lead arrives",
  stage_changed: "A lead moves to a stage",
  showing_feedback: "Showing feedback is logged",
  open_house_visit: "Someone signs in at an open house",
  deal_opened: "A deal is opened",
  deal_closed: "A deal closes",
} as const;
export type Trigger = keyof typeof TRIGGERS;

export type Step = { after_hours: number; kind: "task"; task_kind: "call" | "email" | "video" | "showing" | "cma"; title: string; note: string } | { after_hours: number; kind: "tag"; tag: string };

export type Template = { key: string; name: string; trigger: Trigger; conditions: Record<string, string>; stop: string[]; steps: Step[]; why: string };

const task = (after_hours: number, title: string, note = "", task_kind: "call" | "email" | "video" | "showing" | "cma" = "call"): Step => ({ after_hours, kind: "task", task_kind, title, note });

export const TEMPLATES: Template[] = [
  {
    key: "speed_to_lead", name: "New lead: speed to lead and first week", trigger: "lead_created", conditions: {}, stop: ["Lost", "Under Contract", "Closed"],
    why: "Leads called within minutes convert far better; most need several touches in the first week.",
    steps: [
      task(0, "Call {first_name} now", "First call within 5 minutes."),
      task(4, "Text {first_name} if you didn't connect", "Short and friendly: who you are and one question about their move.", "email"),
      task(24, "Second call to {first_name}"),
      task(72, "Email {first_name} a few homes that fit", "Use Listings that fit on their page.", "email"),
      task(168, "One-week check-in with {first_name}"),
    ],
  },
  {
    key: "nurture", name: "Long-term nurture for leads not ready yet", trigger: "stage_changed", conditions: { stage: "Contacted" }, stop: ["Lost", "Qualified", "Showing", "Offer", "Under Contract", "Closed"],
    why: "Most buyers take months; a light, regular touch keeps you the agent they call.",
    steps: [
      { after_hours: 0, kind: "tag", tag: "nurture" },
      task(24 * 14, "Two-week check-in with {first_name}", "Share one market fact for their area.", "email"),
      task(24 * 45, "Call {first_name}: timeline still the same?"),
      task(24 * 90, "Quarterly check-in with {first_name}", "", "email"),
    ],
  },
  {
    key: "after_showing", name: "After a showing they liked", trigger: "showing_feedback", conditions: { interest: "interested" }, stop: ["Lost", "Under Contract", "Closed"],
    why: "Interest fades fast; a same-day follow-up is when second showings and offers happen.",
    steps: [
      task(2, "Ask {first_name} about a second look or an offer", "Bring comps and the payment estimate."),
      task(48, "Follow up with {first_name} on the home they liked"),
    ],
  },
  {
    key: "open_house_followup", name: "Open house visitors without an agent", trigger: "open_house_visit", conditions: { has_agent: "false" }, stop: ["Lost", "Under Contract", "Closed"],
    why: "Unrepresented visitors are the open house's real value; follow up within a day.",
    steps: [
      { after_hours: 0, kind: "tag", tag: "open house" },
      task(24, "Thank {first_name} for visiting; ask what they're looking for"),
      task(24 * 5, "Send {first_name} homes like the one they saw", "", "email"),
    ],
  },
  {
    key: "under_contract", name: "Under contract: keep the client informed", trigger: "deal_opened", conditions: {}, stop: ["Lost"],
    why: "Clients who hear from you weekly during escrow are calmer and refer more.",
    steps: [
      task(0, "Send {first_name} the timeline and who's who (lender, title)", "Their client portal shows the milestones.", "email"),
      task(24 * 7, "Weekly update to {first_name}", "", "email"),
      task(24 * 14, "Weekly update to {first_name}", "", "email"),
    ],
  },
  {
    key: "aftercare", name: "After closing: aftercare and referrals", trigger: "deal_closed", conditions: {}, stop: [],
    why: "Past clients are the cheapest source of the next deal: stay close after closing.",
    steps: [
      { after_hours: 0, kind: "tag", tag: "past client" },
      task(24 * 3, "Ask {first_name} for a review", "Past clients page has a ready message with your review link.", "email"),
      task(24 * 30, "30-day check-in with {first_name}: settling in?"),
      task(24 * 180, "Six-month check-in with {first_name}"),
    ],
  },
];

const KINDS = ["call", "email", "video", "showing", "cma"] as const;

/** Validate steps coming from the editor: known kinds, sane delays, bounded text. Returns an error or clean steps. */
export function cleanSteps(raw: unknown): { steps: Step[] } | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { error: "Add at least one step." };
  if (raw.length > 20) return { error: "Up to 20 steps." };
  const steps: Step[] = [];
  for (const [i, s] of raw.entries()) {
    const after = Number((s as { after_hours?: unknown })?.after_hours);
    if (!Number.isFinite(after) || after < 0 || after > 8760) return { error: `Step ${i + 1}: delay must be 0 to 8760 hours.` };
    const x = s as Record<string, unknown>;
    if (x.kind === "tag") {
      const tag = normTag(String(x.tag ?? ""));
      if (!tag) return { error: `Step ${i + 1}: name the tag.` };
      steps.push({ after_hours: after, kind: "tag", tag });
    } else if (x.kind === "task") {
      const title = String(x.title ?? "").trim().slice(0, 300);
      if (!title) return { error: `Step ${i + 1}: give the task a title.` };
      const kind = KINDS.includes(x.task_kind as (typeof KINDS)[number]) ? (x.task_kind as (typeof KINDS)[number]) : "call";
      steps.push({ after_hours: after, kind: "task", task_kind: kind, title, note: String(x.note ?? "").trim().slice(0, 2000) });
    } else return { error: `Step ${i + 1}: unknown step type.` };
  }
  return { steps };
}

/** "after 0h" -> "Right away", 4 -> "4 hours later", 48 -> "2 days later". */
export function whenLabel(hours: number) {
  if (hours === 0) return "Right away";
  if (hours < 24 || hours % 24) return `${hours} hour${hours === 1 ? "" : "s"} later`;
  const d = hours / 24;
  return `${d} day${d === 1 ? "" : "s"} later`;
}
