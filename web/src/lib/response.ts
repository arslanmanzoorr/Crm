// Speed to lead, no I/O: how long inbound leads waited for a first call, text or email.

export type Wait = "new" | "late" | "later" | "overdue";
/** 0-5 min fine, 5-15 late, 15-60 later, 60+ overdue (owners are alerted). */
export function waitLevel(minutes: number): Wait {
  return minutes < 5 ? "new" : minutes < 15 ? "late" : minutes < 60 ? "later" : "overdue";
}

/** "4 min", "2 h 5 min", "3 d". */
export function fmtWait(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes));
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;
  return `${Math.floor(m / 1440)} d`;
}

export type ResponseRow = { createdAt: string; firstResponseAt: string | null };
export type ResponseStats = { leads: number; answered: number; waiting: number; medianMin: number | null; within5: number; within60: number };

/** Percentages are of all leads in the window, so a lead nobody answered counts against the score. */
export function responseStats(rows: ResponseRow[]): ResponseStats {
  const mins = rows.filter((r) => r.firstResponseAt).map((r) => (Date.parse(r.firstResponseAt!) - Date.parse(r.createdAt)) / 60_000).sort((a, b) => a - b);
  const pct = (n: number) => (rows.length ? Math.round((n / rows.length) * 100) : 0);
  const mid = mins.length ? (mins.length % 2 ? mins[(mins.length - 1) / 2] : (mins[mins.length / 2 - 1] + mins[mins.length / 2]) / 2) : null;
  return {
    leads: rows.length, answered: mins.length, waiting: rows.length - mins.length,
    medianMin: mid === null ? null : Math.round(mid * 10) / 10,
    within5: pct(mins.filter((m) => m <= 5).length), within60: pct(mins.filter((m) => m <= 60).length),
  };
}
