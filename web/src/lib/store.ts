// The public playbook store, no I/O: the real installable templates, grouped and described for browsing.
import { TEMPLATES, TRIGGERS, type Template } from "./playbooks.ts";

export const CATEGORIES = {
  lead_created: "New leads",
  stage_changed: "Nurture",
  showing_feedback: "Showings",
  open_house_visit: "Open houses",
  deal_opened: "Under contract",
  deal_closed: "Past clients",
} as const satisfies Record<keyof typeof TRIGGERS, string>;

export type StoreItem = Template & { category: string; when: string; taskCount: number; span: string };

/** "Right away", "After 4 hours", "Day 3", "Week 2", "Month 6": when a step happens, in plain words. */
export function delayLabel(h: number): string {
  if (h <= 0) return "Right away";
  if (h < 24) return `After ${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.round(h / 24);
  if (d < 14) return `Day ${d + 1}`;
  if (d < 60) return `Week ${Math.round(d / 7) + 1}`;
  return `Month ${Math.round(d / 30)}`;
}

/** How long the whole playbook runs, from its last step. */
export function spanLabel(t: Template): string {
  const h = Math.max(0, ...t.steps.map((s) => s.after_hours));
  if (h < 24) return "Same day";
  const d = Math.round(h / 24);
  return d < 14 ? `${d} days` : d < 60 ? `${Math.round(d / 7)} weeks` : `${Math.round(d / 30)} months`;
}

export const STORE: StoreItem[] = TEMPLATES.map((t) => ({
  ...t,
  category: CATEGORIES[t.trigger],
  when: TRIGGERS[t.trigger],
  taskCount: t.steps.filter((s) => s.kind === "task").length,
  span: spanLabel(t),
}));

export const storeItem = (key: string) => STORE.find((s) => s.key === key);

/** Step text for a public page: the {first_name} placeholder reads as "the client". */
export const stepText = (s: Template["steps"][number]) => (s.kind === "tag" ? `Tag them "${s.tag}"` : s.title.replace(/\{first_name\}/g, "the client"));
