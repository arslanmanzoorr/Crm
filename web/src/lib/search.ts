/**
 * Turns user input into a plain substring for ILIKE / PostgREST filters: LIKE wildcards (% _ *),
 * escape (\) and filter-syntax characters (, ( ) ") become spaces, so a search can never widen
 * into a pattern or inject another filter clause.
 */
export const likeSafe = (q: string) =>
  q.toLowerCase().replace(/[%_*\\,()"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

/** Only same-site paths survive as post-login destinations (blocks //evil.com and /\evil.com open redirects). */
export const safeNext = (n: unknown) =>
  typeof n === "string" && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") && !/[\r\n]/.test(n) ? n.slice(0, 300) : "/";

/** Tags are lowercase words: letters, digits, spaces and dashes, max 30 chars. Anything else is dropped. */
export const normTag = (t: string) => t.toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/\s+/g, " ").trim().slice(0, 30);
export const normTags = (s: string) => [...new Set(s.split(",").map(normTag).filter(Boolean))].slice(0, 20);

/** "4 min", "3 h", "2 days": the coarsest unit that keeps it readable. */
export function fmtDuration(ms: number) {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} days`;
}
