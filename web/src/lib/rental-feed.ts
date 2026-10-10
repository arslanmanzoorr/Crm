// Zillow Rental Network feed (HotPads XML 2.1, fees per MITS 5.0), no I/O.
// Spec: Zillow Rentals "Rental Listing Bulk Feed Guide". A listing left out of the feed is removed from Zillow.

export type Fee = {
  type: FeeType; name?: string; amount: number;
  timing: "atApplication" | "moveIn" | "monthly" | "moveOut";
  requirement: "mandatory" | "optional" | "situational";
  refundable?: boolean;
};

/** The fees the listing form offers, in the order it shows them. `customFee` carries its own name. */
export const FEE_TYPES = {
  applicationFee: { label: "Application fee", timing: "atApplication" },
  securityDeposit: { label: "Security deposit", timing: "moveIn" },
  petDeposit: { label: "Pet deposit", timing: "moveIn" },
  petRent: { label: "Pet rent (monthly)", timing: "monthly" },
  parkingFee: { label: "Parking (monthly)", timing: "monthly" },
  customFee: { label: "Other", timing: "monthly" },
} as const;
export type FeeType = keyof typeof FEE_TYPES;

export const HOME_TYPES = { HOUSE: "House", CONDO: "Condo / apartment", TOWNHOUSE: "Townhouse" } as const;
export const PARKING = { garageAttached: "Attached garage", garageLot: "Garage lot", coveredLot: "Covered", street: "Street", surfaceLot: "Open lot", other: "Other", none: "None" } as const;

export type FeedListing = {
  id: string; street: string; unit: string | null; city: string; state: string; zip: string; home_type: string;
  price: number; beds: number; baths: number; sqft: number | null; description: string; lease_months: number | null;
  available_on: string | null; furnished: boolean; cats_ok: boolean | null; dogs_ok: boolean | null; parking: string | null;
  fees: Fee[]; tour_url: string | null; updated_at: string; photos: string[];
};
export type FeedData = { org: string; company: string; contact: { name: string; email: string; phone: string }; listings: FeedListing[] };

const esc = (v: unknown) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")
  // XML 1.0 forbids most control characters; strip them rather than emit an invalid feed.
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
const el = (tag: string, v: unknown) => (v === null || v === undefined || v === "" ? "" : `<${tag}>${esc(v)}</${tag}>`);

/** 2.5 baths → 2 full + 1 half; quarter/three-quarter baths round to the nearest half. */
export function splitBaths(b: number) {
  const full = Math.floor(b), half = b - full >= 0.25 ? 1 : 0;
  return { full, half };
}

export const leaseTerm = (m: number | null) => (m === null ? null : m === 0 ? "monthly" : `${m} Months`);

function feeXml(f: Fee) {
  return `<fee><feeCalculationType value="${esc(f.amount)}" valueType="flatFee"/><feeType>${esc(f.type)}</feeType>`
    + (f.type === "customFee" ? el("feeName", f.name) : "")
    + `${el("feeTimingType", f.timing)}${el("feeRequirementType", f.requirement)}`
    + (f.refundable === undefined ? "" : el("feeRefundableType", f.refundable ? "refundable" : "nonRefundable"))
    + "</fee>";
}

/** The whole feed. `photoUrl(mediaId)` must give a stable public URL per photo. */
export function feedXml(d: FeedData, photoUrl: (mediaId: string) => string) {
  const listings = d.listings.map((l) => {
    const baths = splitBaths(Number(l.baths));
    const pets = [l.cats_ok !== null && ["cats", l.cats_ok], l.dogs_ok !== null && ["dogs", l.dogs_ok]].filter(Boolean) as [string, boolean][];
    return `<Listing id="${esc(l.id)}" type="RENTAL" companyId="${esc(d.org)}" propertyType="${esc(l.home_type)}">`
      + el("unit", l.unit) + `<street hide="false">${esc(l.street)}</street>` + el("city", l.city) + el("state", l.state) + el("zip", l.zip)
      + el("lastUpdated", new Date(l.updated_at).toISOString())
      + el("contactName", d.contact.name) + el("contactEmail", d.contact.email) + el("contactPhone", d.contact.phone)
      + el("description", l.description) + el("leaseTerm", leaseTerm(l.lease_months)) + el("virtualTourUrl", l.tour_url)
      + el("isFurnished", l.furnished)
      + (l.parking ? `<parking>${el("parkingType", l.parking)}</parking>` : "")
      + (pets.length ? `<pets>${pets.map(([t, ok]) => `<pet>${el("petType", t)}${el("allowed", ok)}</pet>`).join("")}</pets>` : "")
      + (l.fees.length ? `<fees>${l.fees.map(feeXml).join("")}</fees>` : "")
      + l.photos.map((m) => `<ListingPhoto source="${esc(photoUrl(m))}"/>`).join("")
      + el("price", Math.round(Number(l.price))) + el("pricingFrequency", "MONTH")
      + el("numBedrooms", l.beds) + el("numFullBaths", baths.full) + (baths.half ? el("numHalfBaths", baths.half) : "")
      + (l.sqft ? el("squareFeet", l.sqft) : "") + el("dateAvailable", l.available_on) + el("providerType", "brokerExclusives")
      + "</Listing>";
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<hotPadsItems version="2.1">`
    + `<Company id="${esc(d.org)}">${el("name", d.company)}</Company>`
    + listings.join("\n") + "</hotPadsItems>\n";
}

/** What a rental still needs before it can go in the feed (empty = it's in). */
export function feedGaps(p: { street?: string | null; city?: string | null; state?: string | null; zip?: string | null; homeType?: string | null; approved?: boolean; status: string }) {
  const gaps: string[] = [];
  if (!p.street || !p.city || !p.state || !p.zip) gaps.push("street, city, state and ZIP");
  if (!p.homeType) gaps.push("home type");
  if (p.approved === false) gaps.push("broker approval");
  if (p.status !== "Active") gaps.push("status Active");
  return gaps;
}

const RULES: Record<Exclude<FeeType, "customFee">, Pick<Fee, "requirement" | "refundable">> = {
  applicationFee: { requirement: "mandatory", refundable: false },
  securityDeposit: { requirement: "mandatory", refundable: true },
  petDeposit: { requirement: "situational", refundable: true }, // only if they have a pet
  petRent: { requirement: "situational" },
  parkingFee: { requirement: "optional" },
};
export const OTHER_FEE_SLOTS = 3;

/** Fees from the listing form: `fee_<type>` amounts plus up to 3 named monthly "other" fees. Blank or 0 = none. */
export function feesFromForm(get: (k: string) => string): Fee[] | { error: string } {
  const amount = (k: string) => { const v = get(k).trim(); return v === "" ? 0 : Number(v); };
  const out: Fee[] = [];
  for (const [type, rule] of Object.entries(RULES) as [keyof typeof RULES, (typeof RULES)[keyof typeof RULES]][]) {
    const a = amount(`fee_${type}`);
    if (!(a >= 0 && a < 1e6)) return { error: `${FEE_TYPES[type].label} must be a positive amount.` };
    if (a > 0) out.push({ type, amount: a, timing: FEE_TYPES[type].timing, ...rule });
  }
  for (let i = 1; i <= OTHER_FEE_SLOTS; i++) {
    const name = get(`other_name_${i}`).trim().slice(0, 60), a = amount(`other_amount_${i}`);
    if (!(a >= 0 && a < 1e6)) return { error: "Other fees must be positive amounts." };
    if (a > 0 && !name) return { error: "Name each other fee (e.g. Trash, Utilities)." };
    if (a > 0) out.push({ type: "customFee", name, amount: a, timing: "monthly", requirement: "mandatory" });
  }
  return out;
}
