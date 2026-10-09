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
