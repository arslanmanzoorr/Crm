// Geographic farming, no I/O: one neighborhood's market numbers, who's due a touch, and a market note to send.

export const areaKey = (s: string) => s.trim().toLowerCase();

export type FarmListing = { area: string; status: string; price: number; soldOn: string | null };
export type FarmPerson = { id: string; name: string; lastTouch: string | null; dnc: boolean; email: boolean };

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const daysAgo = (iso: string, today: string) => Math.floor((Date.parse(today) - Date.parse(iso.slice(0, 10))) / 86_400_000);

/** Market numbers for one area from the team's own listings, plus people not touched in `touchDays` (never DNC). */
export function farmReport(area: string, listings: FarmListing[], people: FarmPerson[], today: string, touchDays = 60) {
  const here = listings.filter((l) => areaKey(l.area) === areaKey(area));
  const active = here.filter((l) => l.status === "Active");
  const sold = here.filter((l) => l.status === "Sold" && l.soldOn && daysAgo(l.soldOn, today) <= 90);
  const due = people.filter((p) => !p.dnc && (!p.lastTouch || daysAgo(p.lastTouch, today) >= touchDays))
    .sort((a, b) => (a.lastTouch ?? "").localeCompare(b.lastTouch ?? ""));
  return {
    active: active.length, pending: here.filter((l) => l.status === "Under contract").length, sold90: sold.length,
    medianActive: median(active.map((l) => l.price)), medianSold: median(sold.map((l) => l.price)), due,
  };
}

const usd = (x: number) => x.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

/** A short neighborhood note an agent can send as-is. Only states numbers the report actually has. */
export function farmNote(area: string, r: ReturnType<typeof farmReport>, agent: string) {
  const lines = [`Hi {first_name}, a quick ${area} market note from ${agent}:`];
  if (r.active) lines.push(`- ${n(r.active, "home")} for sale${r.medianActive ? `, typically around ${usd(r.medianActive)}` : ""}.`);
  if (r.pending) lines.push(`- ${n(r.pending, "home")} under contract.`);
  if (r.sold90) lines.push(`- ${r.sold90} sold in the last 90 days${r.medianSold ? `, at a typical ${usd(r.medianSold)}` : ""}.`);
  if (lines.length === 1) lines.push("- It's been a quiet stretch, which can be a good time to sell with less competition.");
  lines.push("Curious what your home would sell for today? Reply and I'll put together a free estimate.");
  return lines.join("\n");
}
