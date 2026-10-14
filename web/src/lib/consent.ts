// Who may be contacted how, no I/O. TCPA: texts need consent; a hand-dialed call without consent is allowed
// only to a number scrubbed against the National Do Not Call Registry within the last 31 days.

export type Consent = { call: boolean; sms: boolean; email: boolean; dnc: boolean; dncCheckedOn?: string | null };

export const SCRUB_DAYS = 31;

/** True when the registry check is recent enough to cold-call (UTC calendar days). */
export function scrubbed(checkedOn: string | null | undefined, today: string) {
  if (!checkedOn) return false;
  const days = (Date.parse(today) - Date.parse(checkedOn)) / 86_400_000;
  return days >= 0 && days < SCRUB_DAYS;
}

/** Calling hours: the team's window, never wider than the federal 8am–9pm. */
export type Hours = { start: number; end: number; hour: number };
const ampm = (h: number) => (h === 12 ? "noon" : h < 12 ? `${h}am` : `${h - 12}pm`);
export const hoursLabel = (h: { start: number; end: number }) => `${ampm(h.start)}–${ampm(h.end)}`;
export function outsideHours(h: Hours | undefined): string | null {
  if (!h) return null;
  const start = Math.max(8, h.start), end = Math.min(21, h.end);
  return h.hour < start || h.hour >= end ? `outside calling hours (${hoursLabel({ start, end })})` : null;
}

/** Why each channel is blocked, or null when it's fine. Calls and texts also wait for calling hours. */
export function blockers(c: Consent, phone: string, email: string, today: string, hours?: Hours) {
  const why = (ok: boolean, has: string, what: string) =>
    c.dnc ? "marked do not contact" : !has ? `no ${what === "email" ? "email address" : "phone number"}` : !ok ? `no ${what} consent` : null;
  const late = outsideHours(hours);
  return {
    call: why(c.call || scrubbed(c.dncCheckedOn, today), phone, "call") ?? late,
    sms: why(c.sms, phone, "SMS") ?? late,
    email: why(c.email, email, "email"),
  };
}
