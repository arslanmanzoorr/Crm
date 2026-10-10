// Buyer <-> listing matching with plain-language reasons. Works from what agents already type:
// the free-text budget ("$600k–$650k", "≤ $350k", "up to 1.2M"), areas, and wants like "3 bed".
// Fair Housing: only property facts and the buyer's stated needs, nothing about people.

export const BUYING_TYPES = ["buyer", "investor", "renter"];

type Buyer = { type?: string; budget: string; areas: string[]; preferences: string[] };
type Listing = { area: string; price: number; beds: number; status: string; estRent?: number | null; listingKind?: "sale" | "rent" };
export type Match = { score: number; fits: string[]; gaps: string[] };

/** Minimum cap rate from wants like "Cap rate > 6%" or "6.5% cap". */
export function minCapRate(preferences: string[]): number | undefined {
  for (const p of preferences) {
    const m = p.match(/cap(?:\s*rate)?\s*(?:>|>=|over|above|of|at least)?\s*(\d+(?:\.\d+)?)\s*%/i) ?? p.match(/(\d+(?:\.\d+)?)\s*%\s*cap/i);
    if (m) return Number(m[1]);
  }
}

/**
 * Quick cap rate from rent and price with standard assumptions: 5% vacancy, 1.1% property tax, $1,200/yr insurance,
 * 16% of collected rent for management and maintenance. The analyzer on the Calculators page is the full version.
 */
export function quickCapRate(price: number, monthlyRent: number) {
  if (price <= 0 || monthlyRent <= 0) return 0;
  const collected = monthlyRent * 12 * 0.95;
  const noi = collected - price * 0.011 - 1200 - collected * 0.16;
  return (noi / price) * 100;
}

const money = (n: number) => (n >= 1e6 ? `$${+(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1e3)}k`);

/** Price range from free text. One number counts as the ceiling ("$500k" means up to $500k). */
export function parseBudget(text: string, floor = 1e4): { min?: number; max?: number } {
  const nums = [...text.replace(/,/g, "").matchAll(/(\d+(?:\.\d+)?)\s*([km])?\b/gi)]
    .map(([, n, unit]) => +n * (unit?.toLowerCase() === "m" ? 1e6 : unit ? 1e3 : 1))
    .filter((n) => n >= floor); // skip "3 bed", "2 units" and other small numbers (rent budgets use a lower floor)
  if (nums.length === 0) return {};
  if (nums.length === 1) return /\b(from|over|above|min|at least)\b|\+|≥|>/i.test(text) ? { min: nums[0] } : { max: nums[0] };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

/** Minimum bedrooms from wants like "3 bed", "4+ beds", "2br". */
export function minBeds(preferences: string[]): number | undefined {
  for (const p of preferences) {
    const m = p.match(/(\d+)\s*\+?\s*(?:bed|bd|br)/i);
    if (m) return +m[1];
  }
}

const STRETCH = 0.1; // listings up to 10% over the ceiling still show, flagged as a stretch

/** How well a listing fits a buyer, or null when it clearly doesn't (wrong area, sold, far over budget). */
export function matchListing(b: Buyer, p: Listing): Match | null {
  if (p.status === "Sold" || (b.type && !BUYING_TYPES.includes(b.type))) return null;
  // Rentals go to renters, homes for sale to buyers and investors.
  if (b.type && (p.listingKind === "rent") !== (b.type === "renter")) return null;
  const fits: string[] = [], gaps: string[] = [];
  let score = 100;

  const areas = b.areas.map((a) => a.trim().toLowerCase()).filter(Boolean);
  const { min, max } = parseBudget(b.budget, p.listingKind === "rent" ? 300 : 1e4);
  if (areas.length === 0 && min === undefined && max === undefined) return null; // nothing to match on
  if (areas.length === 0) { score -= 20; gaps.push("No areas set"); }
  else if (areas.includes(p.area.trim().toLowerCase())) fits.push(`In ${p.area.trim()}`);
  else return null;

  if (max !== undefined && p.price > max * (1 + STRETCH)) return null;
  if (max !== undefined && p.price > max) { score -= 20; gaps.push(`${money(p.price - max)} over budget`); }
  else if (min !== undefined && p.price < min * 0.8) { score -= 15; gaps.push("Well under their range"); }
  else if (min !== undefined || max !== undefined) fits.push("Within budget");
  else { score -= 20; gaps.push("No budget set"); }

  const beds = minBeds(b.preferences);
  if (beds !== undefined) {
    if (p.beds >= beds) fits.push(`${p.beds} beds (wants ${beds}+)`);
    else if (beds - p.beds >= 2) return null;
    else { score -= 25; gaps.push(`${p.beds} beds, wants ${beds}`); }
  }
  const cap = minCapRate(b.preferences);
  if (cap !== undefined) {
    if (!p.estRent) { score -= 15; gaps.push("No rent estimate to check the cap rate"); }
    else {
      const est = quickCapRate(p.price, p.estRent);
      if (est >= cap) fits.push(`≈${est.toFixed(1)}% cap rate (wants ${cap}%+)`);
      else if (cap - est <= 1) { score -= 20; gaps.push(`≈${est.toFixed(1)}% cap rate, wants ${cap}%`); }
      else return null;
    }
  }
  if (p.status === "Under contract") { score -= 30; gaps.push("Under contract"); }

  return score > 0 ? { score, fits, gaps } : null;
}

type Comparable = { price: number; beds: number; baths: number; sqft: number; est_rent?: number | null };

/** Side-by-side rows for saved homes, with the best value in each row flagged (lowest price, most space). */
export function compareHomes(homes: Comparable[]) {
  const row = (label: string, vals: (number | null)[], best: "min" | "max", fmt: (n: number) => string) => {
    const real = vals.filter((v): v is number => v !== null && v > 0);
    const target = real.length > 1 ? (best === "min" ? Math.min(...real) : Math.max(...real)) : null;
    return { label, cells: vals.map((v) => ({ text: v && v > 0 ? fmt(v) : "–", best: target !== null && v === target })) };
  };
  const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
  return [
    row("Price", homes.map((h) => h.price), "min", usd),
    row("Price per sqft", homes.map((h) => (h.sqft ? h.price / h.sqft : null)), "min", usd),
    row("Bedrooms", homes.map((h) => h.beds), "max", String),
    row("Bathrooms", homes.map((h) => h.baths), "max", String),
    row("Square feet", homes.map((h) => h.sqft), "max", (n) => n.toLocaleString("en-US")),
    ...(homes.some((h) => h.est_rent) ? [row("Estimated rent", homes.map((h) => h.est_rent ?? null), "max", (n) => `${usd(n)}/mo`)] : []),
  ];
}

type Rated = { interest: "not_interested" | "maybe" | "interested" | "offer" | null; price: number; beds: number; area: string; features: string[] };

/**
 * What a buyer's showing reactions say, next to what their search says. Plain observations for the agent to
 * confirm with the buyer, never applied automatically. Fair Housing: property facts only.
 */
export function learnedPreferences(rated: Rated[], budget: string) {
  const liked = rated.filter((r) => r.interest === "interested" || r.interest === "offer");
  const passed = rated.filter((r) => r.interest === "not_interested");
  if (liked.length + passed.length < 2) return null;
  const notes: string[] = [];
  const money = (n: number) => (n >= 1e6 ? `$${+(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1e3)}k`);
  if (liked.length) {
    const prices = liked.map((r) => r.price), lo = Math.min(...prices), hi = Math.max(...prices);
    notes.push(`Liked ${liked.length} ${liked.length === 1 ? "home" : "homes"} at ${lo === hi ? money(lo) : `${money(lo)}–${money(hi)}`}.`);
    const { max } = parseBudget(budget);
    if (max && hi > max) notes.push(`That's above their stated budget (${money(max)}). Worth confirming financing.`);
    const beds = Math.min(...liked.map((r) => r.beds));
    if (beds > 0 && liked.length >= 2) notes.push(`Every home they liked had ${beds}+ bedrooms.`);
    const count = (xs: string[]) => [...xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>())];
    const areas = count(liked.map((r) => r.area.trim()).filter(Boolean)).filter(([, n]) => n >= 2).map(([a]) => a);
    if (areas.length) notes.push(`Keeps liking ${areas.join(" and ")}.`);
    const feats = count(liked.flatMap((r) => r.features.map((f) => f.trim().toLowerCase()))).filter(([, n]) => n >= 2).map(([f]) => f);
    if (feats.length) notes.push(`Common thread: ${feats.slice(0, 3).join(", ")}.`);
  }
  if (passed.length) {
    const shared = passed.filter((p) => !liked.some((l) => l.area.trim().toLowerCase() === p.area.trim().toLowerCase()));
    if (passed.length >= 2 && shared.length === passed.length) {
      const areas = [...new Set(passed.map((p) => p.area.trim()).filter(Boolean))];
      if (areas.length) notes.push(`Passed on everything in ${areas.join(" and ")}.`);
    }
  }
  return { liked: liked.length, passed: passed.length, notes };
}
