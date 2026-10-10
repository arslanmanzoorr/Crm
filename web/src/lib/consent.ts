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

/** Why each channel is blocked, or null when it's fine. */
export function blockers(c: Consent, phone: string, email: string, today: string) {
  const why = (ok: boolean, has: string, what: string) =>
    c.dnc ? "marked do not contact" : !has ? `no ${what === "email" ? "email address" : "phone number"}` : !ok ? `no ${what} consent` : null;
  return {
    call: why(c.call || scrubbed(c.dncCheckedOn, today), phone, "call"),
    sms: why(c.sms, phone, "SMS"),
    email: why(c.email, email, "email"),
  };
}
