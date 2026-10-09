// Deal math with no I/O: the default contract timeline, commission splits and explainable risk flags.
// Dates are plain "YYYY-MM-DD" strings (contract dates have no time of day).

export type Side = "buyer" | "seller";
export type Milestone = { title: string; dueOn: string | null; doneAt: string | null };

const DAY = 86_400_000;
const toDay = (d: string) => Date.parse(`${d}T00:00:00Z`);
export const addDays = (d: string, n: number) => new Date(toDay(d) + n * DAY).toISOString().slice(0, 10);
export const daysBetween = (from: string, to: string) => Math.round((toDay(to) - toDay(from)) / DAY);

/**
 * A typical US purchase timeline, counted from acceptance (or back from closing).
 * Contracts differ by state and deal; every date stays editable on the deal page.
 */
export function defaultMilestones(side: Side, acceptedOn: string, closeOn: string | null): { title: string; dueOn: string }[] {
  const close = closeOn ?? addDays(acceptedOn, 30);
  const them = side === "seller" ? "Buyer's " : "";
  return [
    { title: "Earnest money deposited", dueOn: addDays(acceptedOn, 3) },
    { title: `${them}Inspection period ends`, dueOn: addDays(acceptedOn, 10) },
    { title: "Appraisal completed", dueOn: addDays(acceptedOn, 21) },
    { title: `${them}Financing contingency ends`, dueOn: addDays(acceptedOn, 21) },
    { title: "Title and escrow cleared", dueOn: addDays(close, -5) },
    { title: "Final walkthrough", dueOn: addDays(close, -1) },
    { title: "Closing", dueOn: close },
  ].map((m, i) => {
    // A short escrow pulls contingencies in: they must clear at least a week before closing (never before acceptance).
    const latest = i < 4 ? addDays(close, -7) : close;
    return m.dueOn > latest ? { ...m, dueOn: latest < acceptedOn ? addDays(acceptedOn, 1) : latest } : m;
  });
}

export type Commission = { gci: number; referral: number; agent: number; brokerage: number };

/** Gross commission, then the referral fee off the top, then the agent/brokerage split. */
export function commission(price: number, commissionPct: number, agentSplitPct: number, referralPct: number): Commission {
  const cents = (n: number) => Math.round(n * 100) / 100;
  const gci = cents((price * commissionPct) / 100);
  const referral = cents((gci * referralPct) / 100);
  const agent = cents(((gci - referral) * agentSplitPct) / 100);
  return { gci, referral, agent, brokerage: cents(gci - referral - agent) };
}

export type Flag = { level: "high" | "medium"; text: string };

const fmt = (d: string) => new Date(toDay(d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** Why a deal might slip, in plain words, most urgent first. */
export function riskFlags(deal: { status: string; closeOn: string | null; lastContactOn: string | null }, milestones: Milestone[], today: string): Flag[] {
  if (deal.status !== "active") return [];
  const flags: Flag[] = [];
  const open = milestones.filter((m) => !m.doneAt && m.dueOn);
  for (const m of open) {
    const d = daysBetween(today, m.dueOn!);
    if (d < 0) flags.push({ level: "high", text: `${m.title} was due ${fmt(m.dueOn!)} (${plural(-d, "day")} overdue)` });
    else if (d <= 2) flags.push({ level: "medium", text: `${m.title} is due ${d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`}` });
  }
  if (deal.closeOn) {
    const d = daysBetween(today, deal.closeOn);
    const left = open.filter((m) => m.title !== "Closing").length;
    if (d >= 0 && d <= 7 && left > 0) flags.push({ level: d <= 3 ? "high" : "medium", text: `Closing in ${plural(d, "day")} with ${plural(left, "item")} still open` });
    if (d < 0) flags.push({ level: "high", text: `Closing date ${fmt(deal.closeOn)} has passed; close the deal or update the date` });
  } else flags.push({ level: "medium", text: "No closing date set" });
  const quiet = deal.lastContactOn ? daysBetween(deal.lastContactOn, today) : null;
  if (quiet !== null && quiet >= 10) flags.push({ level: "medium", text: `No logged contact with the client in ${quiet} days` });
  return flags.sort((a, b) => (a.level === b.level ? 0 : a.level === "high" ? -1 : 1));
}
