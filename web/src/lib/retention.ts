// Lifetime Client Engine, no I/O: what each past client needs from us next, and why.
import { addDays, daysBetween } from "./deals.ts";

export type PastClient = {
  contactId: string; name: string; dealId: string; side: "buyer" | "seller"; address: string;
  closedOn: string;            // YYYY-MM-DD
  lastTouchOn: string | null;  // last logged activity, YYYY-MM-DD
  reviewAskedOn: string | null;
  hasTestimonial: boolean;
  activeDeal: boolean;         // already buying or selling again
};

export type Health = "good" | "due" | "overdue";
export type Reminder = { kind: "anniversary" | "checkin" | "review" | "repeat"; contactId: string; dealId: string; name: string; text: string; dueOn: string };

/** Check in every 30 days for the first 90 days after closing, then every 90 days. */
export const cadence = (daysSinceClose: number) => (daysSinceClose < 90 ? 30 : 90);

export function health(c: PastClient, today: string): { health: Health; daysSinceTouch: number; nextOn: string } {
  const since = daysBetween(c.closedOn, today);
  const last = c.lastTouchOn && c.lastTouchOn > c.closedOn ? c.lastTouchOn : c.closedOn;
  const gap = cadence(since);
  const quiet = daysBetween(last, today);
  return { health: quiet <= gap ? "good" : quiet <= gap * 1.5 ? "due" : "overdue", daysSinceTouch: quiet, nextOn: addDays(last, gap) };
}

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
const years = (n: number) => `${n} year${n === 1 ? "" : "s"}`;

/** Reminders due within `horizon` days (or already late), soonest first. */
export function agenda(clients: PastClient[], today: string, horizon = 14): Reminder[] {
  const out: Reminder[] = [];
  const until = addDays(today, horizon);
  for (const c of clients) {
    const base = { contactId: c.contactId, dealId: c.dealId, name: c.name };
    const since = daysBetween(c.closedOn, today);
    if (since < 0) continue;

    // Home anniversary: the next occurrence of the closing date, from the first year on.
    const [y, md] = [Number(today.slice(0, 4)), c.closedOn.slice(4)];
    let next = `${y}${md}`;
    if (md === "-02-29" && !(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0))) next = `${y}-02-28`;
    if (next < today) next = `${y + 1}${md === "-02-29" ? "-02-28" : md}`;
    const n = Number(next.slice(0, 4)) - Number(c.closedOn.slice(0, 4));
    const greeted = !!c.lastTouchOn && c.lastTouchOn >= addDays(next, -horizon); // already reached out for this one
    if (n >= 1 && next <= until && !greeted)
      out.push({ ...base, kind: "anniversary", dueOn: next, text: `${ordinal(n)} home anniversary${c.side === "buyer" ? ` at ${c.address}` : ""} (${years(n)} since closing)` });

    const h = health(c, today);
    if (h.nextOn <= until)
      out.push({ ...base, kind: "checkin", dueOn: h.nextOn < today ? today : h.nextOn, text: since < 90 ? `Post-closing check-in (${since} days since closing)` : `Check in: no contact in ${h.daysSinceTouch} days` });

    if (!c.reviewAskedOn && !c.hasTestimonial && since >= 3 && since <= 120)
      out.push({ ...base, kind: "review", dueOn: today, text: "Ask for a review while the closing is fresh" });

    if (c.side === "buyer" && !c.activeDeal && since >= 5 * 365 && n >= 5)
      out.push({ ...base, kind: "repeat", dueOn: today, text: `Owned ${years(Math.floor(since / 365))}: ask about their plans (move-up, refinance, investment)` });
  }
  return out.sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.name.localeCompare(b.name));
}
