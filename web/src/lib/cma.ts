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
