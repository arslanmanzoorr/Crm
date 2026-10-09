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
