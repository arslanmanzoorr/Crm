// Showing helpers with no I/O: double-booking checks and calendar files (RFC 5545).

export type Slot = { id: string; agentId: string | null; startsAt: string; endsAt: string; status: string };

const live = (s: Slot) => s.status === "requested" || s.status === "confirmed";

/** Showings that overlap another live showing for the same agent. Back-to-back (end == start) is fine. */
export function conflicts(slots: Slot[]): Set<string> {
  const out = new Set<string>();
  const byAgent = new Map<string, Slot[]>();
  for (const s of slots.filter(live)) {
    const k = s.agentId ?? "none";
    byAgent.set(k, [...(byAgent.get(k) ?? []), s]);
  }
  for (const list of byAgent.values()) {
    list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    let latest: Slot | null = null; // the slot reaching furthest so far
    for (const s of list) {
      if (latest && Date.parse(s.startsAt) < Date.parse(latest.endsAt)) { out.add(s.id); out.add(latest.id); }
      if (!latest || Date.parse(s.endsAt) > Date.parse(latest.endsAt)) latest = s;
    }
  }
  return out;
}

const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines longer than 75 octets continue on the next line after a space (RFC 5545 §3.1), never splitting a character. */
function fold(line: string) {
  const out: string[] = [];
  let cur = "", bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch);
    if (bytes + n > (out.length ? 74 : 75)) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch; bytes += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function ics(e: { uid: string; startsAt: string; endsAt: string; title: string; location: string; description: string; now?: string }) {
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EstateOS//Showings//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@estateos`,
    `DTSTAMP:${icsDate(e.now ?? new Date().toISOString())}`,
    `DTSTART:${icsDate(e.startsAt)}`,
    `DTEND:${icsDate(e.endsAt)}`,
    `SUMMARY:${icsText(e.title)}`,
    `LOCATION:${icsText(e.location)}`,
    `DESCRIPTION:${icsText(e.description)}`,
    "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", `DESCRIPTION:${icsText(e.title)}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].map(fold).join("\r\n") + "\r\n";
}

/** Back-to-back slots for a tour: each home gets `minutes`, with `travel` minutes between homes. */
export function planTour(startIso: string, count: number, minutes: number, travel: number): { startsAt: string; endsAt: string }[] {
  const start = Date.parse(startIso);
  if (!Number.isFinite(start) || count < 1 || minutes < 5 || travel < 0) return [];
  return Array.from({ length: Math.min(count, 12) }, (_, i) => {
    const s = start + i * (minutes + travel) * 60_000;
    return { startsAt: new Date(s).toISOString(), endsAt: new Date(s + minutes * 60_000).toISOString() };
  });
}

/** US time zones a team can pick (IANA names). */
export const US_TIME_ZONES = {
  "America/New_York": "Eastern", "America/Chicago": "Central", "America/Denver": "Mountain", "America/Phoenix": "Arizona",
  "America/Los_Angeles": "Pacific", "America/Anchorage": "Alaska", "Pacific/Honolulu": "Hawaii", "America/Puerto_Rico": "Atlantic (Puerto Rico)",
} as const;

/** Calendar parts of an instant as seen in `tz`. */
function partsIn(t: Date, tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })
    .formatToParts(t).map((x) => [x.type, Number(x.value)]));
  return { y: p.year, mo: p.month - 1, d: p.day, h: p.hour, mi: p.minute };
}

/** The instant that is `h:mi` on y-mo-d in `tz` (DST-safe: corrects the offset after a first guess). */
export function zonedTime(y: number, mo: number, d: number, h: number, mi: number, tz: string): Date {
  const want = Date.UTC(y, mo, d, h, mi);
  let t = want;
  for (let i = 0; i < 2; i++) {
    const p = partsIn(new Date(t), tz);
    t += want - Date.UTC(p.y, p.mo, p.d, p.h, p.mi);
  }
  return new Date(t);
}

/**
 * Open half-hour showing slots for the next `days` days, between `fromHour` and `toHour` in the team's time zone
 * (or the visitor's clock when the team hasn't set one), at least an hour out, minus anything overlapping a taken showing.
 */
export function openSlots(now: Date, busy: [string, string][], tz?: string | null, days = 7, fromHour = 9, toHour = 18): Date[] {
  const taken = busy.map(([s, e]) => [Date.parse(s), Date.parse(e)] as const);
  const earliest = now.getTime() + 3600_000, out: Date[] = [];
  const today = tz ? partsIn(now, tz) : { y: now.getFullYear(), mo: now.getMonth(), d: now.getDate() };
  for (let d = 0; d < days; d++) {
    for (let m = fromHour * 60; m < toHour * 60; m += 30) {
      const t = tz ? zonedTime(today.y, today.mo, today.d + d, 0, m, tz) : new Date(today.y, today.mo, today.d + d, 0, m);
      const s = t.getTime(), e = s + 30 * 60_000;
      if (s >= earliest && !taken.some(([bs, be]) => s < be && bs < e)) out.push(t);
    }
  }
  return out;
}
