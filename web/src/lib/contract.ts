// AI contract reader: what we ask for, how we check the answer, and which existing milestone each date belongs to.
// No I/O. The agent confirms every date before anything changes.

export const CONTRACT_SCHEMA = {
  type: "object", additionalProperties: false, required: ["accepted_on", "close_on", "price", "deadlines"],
  properties: {
    accepted_on: { type: "string", description: "Effective/acceptance date as YYYY-MM-DD, or empty if not stated" },
    close_on: { type: "string", description: "Closing/settlement date as YYYY-MM-DD, or empty" },
    price: { type: "number", description: "Purchase price in dollars, or 0 if not stated" },
    deadlines: {
      type: "array", items: {
        type: "object", additionalProperties: false, required: ["title", "due_on", "quote"],
        properties: {
          title: { type: "string", description: "Short name, e.g. 'Inspection period ends'" },
          due_on: { type: "string", description: "YYYY-MM-DD. If the contract gives days after acceptance, compute the date." },
          quote: { type: "string", description: "The exact words from the contract this comes from (max 200 characters)" },
        },
      },
    },
  },
} as const;

export type ContractDate = { title: string; dueOn: string; quote: string };
export type ContractRead = { acceptedOn: string | null; closeOn: string | null; price: number | null; deadlines: ContractDate[] };

const isDate = (v: unknown): v is string => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && v >= "2000-01-01" && v <= "2100-12-31";
};
const text = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");

/** Keeps only well-formed answers: real dates, short titles, quotes kept as evidence, no duplicates. */
export function cleanContract(raw: unknown): ContractRead {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const seen = new Set<string>();
  const deadlines = (Array.isArray(o.deadlines) ? o.deadlines : []).flatMap((d) => {
    const x = (d ?? {}) as Record<string, unknown>;
    const title = text(x.title, 120), dueOn = x.due_on;
    if (!title || !isDate(dueOn) || seen.has(`${title.toLowerCase()}|${dueOn}`)) return [];
    seen.add(`${title.toLowerCase()}|${dueOn}`);
    return [{ title, dueOn, quote: text(x.quote, 300) }];
  }).slice(0, 25).sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  const price = typeof o.price === "number" && o.price >= 1000 && o.price <= 1e9 ? Math.round(o.price) : null;
  return { acceptedOn: isDate(o.accepted_on) ? o.accepted_on : null, closeOn: isDate(o.close_on) ? o.close_on : null, price, deadlines };
}

// Words that identify each standard milestone, so "Buyer's Inspection Period expires" updates "Inspection period ends".
// Order matters: "close of escrow" is the closing, so closing is checked before title/escrow.
const KINDS: [string, RegExp][] = [
  ["earnest", /earnest|deposit/i], ["inspection", /inspect/i], ["appraisal", /apprais/i],
  ["financing", /financ|loan|mortgage/i], ["walkthrough", /walk.?through/i], ["closing", /clos|settlement/i], ["title", /title|escrow/i],
];
const kind = (t: string) => KINDS.find(([, re]) => re.test(t))?.[0] ?? null;

/** The existing milestone a contract date should update, if any (same kind, not already used). */
export function matchMilestone<M extends { id: string; title: string }>(title: string, milestones: M[], used: Set<string>): M | null {
  const k = kind(title);
  if (!k) return null;
  return milestones.find((m) => !used.has(m.id) && kind(m.title) === k) ?? null;
}
