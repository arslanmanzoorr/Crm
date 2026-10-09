// Offer comparison with no I/O: which offer is strongest on what, in plain words.

export const FINANCING = { cash: "Cash", conventional: "Conventional", fha: "FHA", va: "VA", usda: "USDA", other: "Other" } as const;
export const CONTINGENCIES = { inspection: "Inspection", appraisal: "Appraisal", financing: "Financing", home_sale: "Sale of their home" } as const;
export const STATUS_LABEL: Record<string, string> = { draft: "Draft", submitted: "Submitted", countered: "Countering", accepted: "Accepted", rejected: "Rejected", withdrawn: "Withdrawn" };
export type Financing = keyof typeof FINANCING;
export type Contingency = keyof typeof CONTINGENCIES;

export type OfferTerms = { id: string; amount: number; sellerCredit: number; earnest: number; financing: Financing; contingencies: Contingency[]; closeOn: string | null; status: string };

/** Price after credits the seller pays back. Commission is left out: it doesn't change which offer nets more. */
export const netOf = (o: OfferTerms) => o.amount - o.sellerCredit;

/**
 * Strengths per live offer (not rejected or withdrawn), only when there's more than one to compare
 * and the offer is strictly best (no shared "best" labels).
 */
export function compareOffers(offers: OfferTerms[]): Record<string, string[]> {
  const live = offers.filter((o) => !["rejected", "withdrawn"].includes(o.status));
  const out: Record<string, string[]> = Object.fromEntries(offers.map((o) => [o.id, []]));
  if (live.length < 2) return out;
  const best = (label: string, score: (o: OfferTerms) => number | null) => {
    const scored = live.map((o) => ({ o, s: score(o) })).filter((x) => x.s !== null) as { o: OfferTerms; s: number }[];
    if (scored.length < 2) return;
    const top = Math.max(...scored.map((x) => x.s));
    const winners = scored.filter((x) => x.s === top);
    if (winners.length === 1) out[winners[0].o.id].push(label);
  };
  best("Highest net", netOf);
  best("Highest price", (o) => o.amount);
  best("Fewest contingencies", (o) => -o.contingencies.length);
  best("Largest earnest money", (o) => o.earnest);
  best("Fastest close", (o) => (o.closeOn ? -Date.parse(o.closeOn) : null));
  for (const o of live) if (o.financing === "cash") out[o.id].push("Cash, no lender");
  // "Highest price" next to "Highest net" on the same offer says nothing new.
  for (const id in out) if (out[id].includes("Highest net")) out[id] = out[id].filter((l) => l !== "Highest price");
  return out;
}
