// Comparative market analysis, no I/O. Every adjustment is a visible dollar amount the agent can change:
// the output is an explained opinion of value, not an appraisal.

export type Home = { sqft: number; beds: number; baths: number };
export type Comp = Home & { id: string; address: string; status: "sold" | "pending" | "active"; price: number; soldOn: string | null; dom: number | null; adjust: number; note: string };
export type Rates = { perSqft: number; perBed: number; perBath: number };

export type Adjusted = { comp: Comp; sqftAdj: number; bedAdj: number; bathAdj: number; total: number; value: number; weight: number };

/** Move a comp's price toward the subject: bigger subject adds value, smaller subtracts; plus the agent's manual adjustment. */
export function adjust(subject: Home, c: Comp, r: Rates, today: string): Adjusted {
  const sqftAdj = Math.round((subject.sqft - c.sqft) * r.perSqft);
  const bedAdj = Math.round((subject.beds - c.beds) * r.perBed);
  const bathAdj = Math.round((subject.baths - c.baths) * r.perBath);
  const total = sqftAdj + bedAdj + bathAdj + Math.round(c.adjust);
  // Weight: closer in size and more recent sales count more; actives count least (asking, not selling, prices).
  const sizeGap = subject.sqft > 0 ? Math.abs(subject.sqft - c.sqft) / subject.sqft : 0;
  const months = c.soldOn ? Math.max(0, (Date.parse(today) - Date.parse(c.soldOn)) / (30.44 * 86_400_000)) : 0;
  const statusW = c.status === "sold" ? 1 : c.status === "pending" ? 0.75 : 0.4;
  const weight = statusW / (1 + 2 * sizeGap) / (1 + months / 6);
  return { comp: c, sqftAdj, bedAdj, bathAdj, total, value: c.price + total, weight };
}

export type Opinion = { low: number; mid: number; high: number; perSqft: number; used: number } | null;

/** Weighted value from adjusted comps; the range is the middle of the adjusted values. Needs 2+ comps. */
export function opinion(subject: Home, comps: Comp[], r: Rates, today: string): Opinion {
  const a = comps.filter((c) => c.price > 0).map((c) => adjust(subject, c, r, today));
  if (a.length < 2) return null;
  const wsum = a.reduce((n, x) => n + x.weight, 0);
  const mid = a.reduce((n, x) => n + x.value * x.weight, 0) / wsum;
  const sorted = a.map((x) => x.value).sort((p, q) => p - q);
  const q = (f: number) => { const i = (sorted.length - 1) * f; const lo = Math.floor(i); return sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo); };
  const round = (n: number) => Math.round(n / 1000) * 1000;
  return { low: round(Math.min(q(0.25), mid)), mid: round(mid), high: round(Math.max(q(0.75), mid)), perSqft: subject.sqft ? Math.round(mid / subject.sqft) : 0, used: a.length };
}

export type NetInputs = { commissionPct: number; closingPct: number; payoff: number; concessions: number; other: number };

/** What the seller walks away with at a given sale price. */
export function sellerNet(price: number, n: NetInputs) {
  const commission = (price * n.commissionPct) / 100;
  const closing = (price * n.closingPct) / 100;
  const net = price - commission - closing - n.payoff - n.concessions - n.other;
  return { price, commission, closing, payoff: n.payoff, concessions: n.concessions, other: n.other, net };
}

const num = (v: unknown, lo: number, hi: number) => { const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? n : NaN; };

/** Validate a CMA coming from the editor. Returns clean data or the first problem, in words. */
export function cleanCma(raw: unknown): { subject: Home; comps: Comp[]; rates: Rates; net: NetInputs; listPrice: number | null; notes: string } | { error: string } {
  const x = (raw ?? {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const subject = { sqft: num(x.subject?.sqft, 0, 100_000), beds: num(x.subject?.beds, 0, 50), baths: num(x.subject?.baths, 0, 50) };
  if (Object.values(subject).some(Number.isNaN)) return { error: "Check the subject home's size, beds and baths." };
  const rates = { perSqft: num(x.rates?.perSqft, 0, 5000), perBed: num(x.rates?.perBed, 0, 1e6), perBath: num(x.rates?.perBath, 0, 1e6) };
  if (Object.values(rates).some(Number.isNaN)) return { error: "Adjustment rates must be positive numbers." };
  const net = { commissionPct: num(x.net?.commissionPct, 0, 100), closingPct: num(x.net?.closingPct, 0, 100), payoff: num(x.net?.payoff, 0, 1e10), concessions: num(x.net?.concessions, 0, 1e10), other: num(x.net?.other, 0, 1e10) };
  if (Object.values(net).some(Number.isNaN)) return { error: "Check the net sheet numbers." };
  if (!Array.isArray(x.comps) || x.comps.length > 30) return { error: "Up to 30 comps." };
  const comps: Comp[] = [];
  for (const [i, c] of x.comps.entries()) {
    const comp = {
      id: String(c?.id ?? i).slice(0, 40), address: String(c?.address ?? "").trim().slice(0, 300),
      status: (["sold", "pending", "active"].includes(c?.status) ? c.status : "sold") as Comp["status"],
      price: num(c?.price, 1, 1e10), sqft: num(c?.sqft, 0, 100_000), beds: num(c?.beds, 0, 50), baths: num(c?.baths, 0, 50),
      soldOn: typeof c?.soldOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(c.soldOn) ? c.soldOn : null,
      dom: c?.dom === null || c?.dom === "" || c?.dom === undefined ? null : num(c.dom, 0, 5000),
      adjust: num(c?.adjust ?? 0, -1e9, 1e9), note: String(c?.note ?? "").slice(0, 500),
    };
    if (!comp.address) return { error: `Comp ${i + 1}: add the address.` };
    if ([comp.price, comp.sqft, comp.beds, comp.baths, comp.adjust].some(Number.isNaN) || (comp.dom !== null && Number.isNaN(comp.dom))) return { error: `Comp ${i + 1}: check the numbers.` };
    comps.push(comp);
  }
  const lp = x.listPrice === null || x.listPrice === "" || x.listPrice === undefined ? null : num(x.listPrice, 1, 1e10);
  if (lp !== null && Number.isNaN(lp)) return { error: "List price must be a positive number." };
  return { subject, comps, rates, net, listPrice: lp, notes: String(x.notes ?? "").slice(0, 5000) };
}
