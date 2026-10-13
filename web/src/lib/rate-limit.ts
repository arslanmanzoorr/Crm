// ponytail: in-memory sliding window per server instance; move to the database or a shared store when the app
// runs on more than one instance and the limits need to be exact.
const hits = new Map<string, number[]>();

/** true if `key` may act now (fewer than `max` times in the last `windowMs`), and records the hit. */
export function allow(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { hits.set(key, recent); return false; }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return true;
}
