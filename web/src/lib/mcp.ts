// The Estos MCP server: tool catalogue, the agent-facing instructions and the JSON-RPC handling. No I/O here: data
// tools go through `rpc` (the database function public.mcp, which runs as the signed-in person under RLS), and the
// math and compliance tools run locally on the shared libraries the app itself uses.
import { closeOutlook, riskFlags, type Milestone } from "./deals.ts";
import { checkFairHousing } from "./fairhousing.ts";
import { analyzeRental, maxPrice, monthlyCost } from "./finance.ts";
import { matchListing } from "./match.ts";
import { compareOffers, type OfferTerms } from "./offers.ts";

export const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
export const SERVER_INFO = { name: "estos", title: "Estos real estate CRM", version: "1.0.0" };

export const INSTRUCTIONS = `Estos is a real estate CRM. These tools act as the signed-in agent, with exactly their access: their active team's leads, listings, deals, showings and tasks.

Start a work session with daily_brief: overdue tasks, new leads still waiting for a first reply, hot leads without a next step, showings, deal deadlines and closings.

Rules that protect the agent (US law and the team's own settings):
- Before suggesting a call, text or email, read the lead's contact_rules. Never suggest texting when can_text is false, calling when can_call is false, or any outreach when do_not_contact is true. Calls and texts only inside calling_hours. Estos tools never send messages; you draft, the agent sends.
- Never record consent the person didn't give. create_lead never sets consent.
- Fair Housing: never describe, rank or steer by race, color, religion, sex, disability, familial status, national origin or other protected classes. Describe homes, not the people who should live in them. Run check_fair_housing on any listing copy or client message you draft.
- Mortgage and investment numbers are estimates for conversation, never a credit decision. Say which assumptions you used.
- Times are ISO 8601 with an offset. The team's time zone is in whoami and daily_brief.
- Ids come from earlier tool results. Never invent one.`;

type Schema = { type: "object"; properties: Record<string, unknown>; required?: string[]; additionalProperties?: boolean };
export type Tool = { name: string; title: string; description: string; inputSchema: Schema; write?: boolean; local?: boolean };

const str = (description: string, extra: object = {}) => ({ type: "string", description, ...extra });
const int = (description: string, extra: object = {}) => ({ type: "integer", description, ...extra });
const num = (description: string, extra: object = {}) => ({ type: "number", description, ...extra });
const bool = (description: string) => ({ type: "boolean", description });
const list = (description: string) => ({ type: "array", items: { type: "string" }, description });
const id = (what: string) => str(`Id of the ${what}, from an earlier result`, { format: "uuid" });
const obj = (properties: Record<string, unknown>, required: string[] = []): Schema =>
  ({ type: "object", properties, ...(required.length ? { required } : {}), additionalProperties: false });

const STAGES = ["New", "Contacted", "Qualified", "Showing", "Offer", "Under Contract", "Closed", "Lost"];
const TYPES = ["buyer", "seller", "renter", "investor", "landlord", "vendor"];
const MOVE = ["asap", "1-3", "3-6", "6-12", "12+"];
const mine = bool("Only the agent's own (owned or assigned) items. Default false: everything the agent can see on the team");
const limit = (max: number) => int(`Most results to return (1-${max})`, { minimum: 1, maximum: max });

export const TOOLS: Tool[] = [
  { name: "whoami", title: "Who am I", description: "The signed-in agent, their team, role, plan, time zone, today's date and whether this connection can make changes.", inputSchema: obj({}) },
  { name: "daily_brief", title: "Daily brief", description: "Everything that needs the agent today, in one call: overdue tasks, tasks due today, new leads waiting for a first reply (with minutes waiting), hot leads with no next step, showings in the next 24 hours, deal deadlines in the next 7 days, deals closing in 30 days and listings about to expire. Use it to plan the day.", inputSchema: obj({ mine }) },
  { name: "search", title: "Search", description: "Find leads (name, email, phone, tag), listings (address, area, city, ZIP, MLS number) and deals (address, client) by a few words.", inputSchema: obj({ query: str("Words to look for", { minLength: 1, maxLength: 100 }) }, ["query"]) },
  { name: "list_leads", title: "List leads", description: "Leads with filters, newest activity or highest score first. Each lead includes contact_rules: who may be called, texted or emailed right now.", inputSchema: obj({
    stage: str("Pipeline stage", { enum: STAGES }), type: str("Lead type", { enum: TYPES }), tag: str("Has this tag"),
    min_score: int("Lowest AI score (0-100)", { minimum: 0, maximum: 100 }), quiet_days: int("No activity for at least this many days", { minimum: 1 }),
    moving_soon: bool("Only leads moving within 3 months"), mine, sort: str("Order", { enum: ["score", "recent", "newest"] }), limit: limit(100) }) },
  { name: "get_lead", title: "Get lead", description: "One lead in full: profile, contact rules, the last 30 timeline entries (calls, texts, emails, notes), open tasks, showings with feedback, deals and offers.", inputSchema: obj({ lead_id: id("lead") }, ["lead_id"]) },
  { name: "match_listings", title: "Match listings to a buyer", description: "The team's listings that fit a buyer, renter or investor lead, best first, with plain reasons (in their area, within budget, beds, cap rate, wants) and gaps. Uses property facts and the lead's stated needs only.", inputSchema: obj({ lead_id: id("lead"), limit: limit(20) }, ["lead_id"]), local: true },
  { name: "list_tasks", title: "List tasks", description: "Tasks by when they're due.", inputSchema: obj({ when: str("Which tasks; default open", { enum: ["overdue", "today", "upcoming", "open", "done"] }), mine, limit: limit(200) }) },
  { name: "list_listings", title: "List listings", description: "The team's listings with filters.", inputSchema: obj({
    status: str("Listing status", { enum: ["Active", "Coming soon", "Under contract", "Sold"] }), for: str("For sale or rent", { enum: ["sale", "rent"] }),
    area: str("Area, city or ZIP"), min_price: num("Lowest price", { minimum: 0 }), max_price: num("Highest price", { minimum: 0 }), min_beds: int("Fewest bedrooms", { minimum: 0 }), limit: limit(100) }) },
  { name: "get_listing", title: "Get listing", description: "One listing in full: facts, description, showing notes, every showing with buyer feedback, the seller, and every offer.", inputSchema: obj({ listing_id: id("listing") }, ["listing_id"]) },
  { name: "compare_offers", title: "Compare offers", description: "The offers on a listing side by side: net to seller after credits, and which is strictly best on net, price, contingencies, earnest money, closing speed and cash.", inputSchema: obj({ listing_id: id("listing") }, ["listing_id"]), local: true },
  { name: "list_deals", title: "List deals", description: "Deals (transactions) with price, commission, closing date and the next open milestone.", inputSchema: obj({ status: str("Default active", { enum: ["active", "closed", "fell_through", "all"] }), mine, limit: limit(200) }) },
  { name: "get_deal", title: "Get deal", description: "One deal with every milestone, last client contact, and a close outlook (On track / Watch / At risk) with the reasons it might slip.", inputSchema: obj({ deal_id: id("deal") }, ["deal_id"]) },
  { name: "list_showings", title: "List showings", description: "Showings in a time window (default: from yesterday to 7 days ahead).", inputSchema: obj({ from: str("Start, ISO 8601", { format: "date-time" }), to: str("End, ISO 8601", { format: "date-time" }), limit: limit(200) }) },
  { name: "pipeline_summary", title: "Pipeline summary", description: "The business at a glance: leads by stage, new leads in 30 days, active deals with volume and gross commission, closings this month, closed this year, active listings and open offers.", inputSchema: obj({}) },
  { name: "check_fair_housing", title: "Fair Housing check", description: "Flags words in listing copy, ads or messages that may break the Fair Housing Act or state rules (steering, protected classes, source of income) or that MLSs ask to avoid, each with the reason and a fix.", inputSchema: obj({ text: str("The text to check", { minLength: 1, maxLength: 20000 }) }, ["text"]), local: true },
  { name: "mortgage_payment", title: "Monthly payment", description: "Estimated monthly cost of a home: principal and interest, property tax, insurance, PMI under 20% down, HOA. An estimate, never a credit decision.", inputSchema: obj({
    price: num("Purchase price", { minimum: 1 }), rate_pct: num("Interest rate, % per year", { minimum: 0, maximum: 30 }), down_pct: num("Down payment, % of price (default 20)", { minimum: 0, maximum: 100 }),
    years: int("Loan term in years (default 30)", { minimum: 1, maximum: 50 }), tax_pct: num("Property tax, % of price per year (default 1.1)", { minimum: 0, maximum: 10 }),
    insurance_per_year: num("Homeowners insurance per year (default 1800)", { minimum: 0 }), hoa_per_month: num("HOA per month (default 0)", { minimum: 0 }),
    pmi_pct: num("PMI, % of loan per year (default 0.5)", { minimum: 0, maximum: 5 }) }, ["price", "rate_pct"]), local: true },
  { name: "affordability", title: "How much can they afford", description: "Highest price that keeps housing within 28% of gross monthly income and all debts within 36% (adjustable). An estimate for conversation, never a credit decision.", inputSchema: obj({
    monthly_income: num("Gross monthly income", { minimum: 0 }), monthly_debts: num("Other monthly debt payments (default 0)", { minimum: 0 }), rate_pct: num("Interest rate, % per year", { minimum: 0, maximum: 30 }),
    down_pct: num("Down payment % (default 20)", { minimum: 0, maximum: 100 }), years: int("Loan term (default 30)", { minimum: 1, maximum: 50 }),
    tax_pct: num("Property tax % per year (default 1.1)", { minimum: 0, maximum: 10 }), insurance_per_year: num("Insurance per year (default 1800)", { minimum: 0 }),
    hoa_per_month: num("HOA per month (default 0)", { minimum: 0 }), front_pct: num("Housing limit, % of income (default 28)", { minimum: 1, maximum: 100 }),
    back_pct: num("All-debt limit, % of income (default 36)", { minimum: 1, maximum: 100 }) }, ["monthly_income", "rate_pct"]), local: true },
  { name: "rental_analysis", title: "Rental property analysis", description: "Investor numbers for a rental: NOI, cap rate, cash flow, cash-on-cash return, DSCR, gross rent multiplier and the 1% rule.", inputSchema: obj({
    price: num("Purchase price", { minimum: 1 }), rent: num("Monthly rent, all units", { minimum: 0 }), rate_pct: num("Interest rate % (default 7)", { minimum: 0, maximum: 30 }),
    down_pct: num("Down payment % (default 25)", { minimum: 0, maximum: 100 }), years: int("Loan term (default 30)", { minimum: 1, maximum: 50 }), rehab: num("Repairs before renting (default 0)", { minimum: 0 }),
    closing_pct: num("Closing costs % of price (default 3)", { minimum: 0, maximum: 20 }), vacancy_pct: num("Vacancy % (default 5)", { minimum: 0, maximum: 100 }),
    tax_pct: num("Property tax % per year (default 1.1)", { minimum: 0, maximum: 10 }), insurance_per_year: num("Insurance per year (default 1800)", { minimum: 0 }),
    hoa_per_month: num("HOA per month (default 0)", { minimum: 0 }), mgmt_pct: num("Management % of rent (default 8)", { minimum: 0, maximum: 100 }),
    maintenance_pct: num("Maintenance and reserves % of rent (default 8)", { minimum: 0, maximum: 100 }), other_income: num("Other monthly income (default 0)", { minimum: 0 }),
    other_expenses: num("Other monthly expenses (default 0)", { minimum: 0 }) }, ["price", "rent"]), local: true },
  { name: "create_lead", title: "Add a lead", description: "Add a person to the CRM. If someone with the same email or phone exists, returns them instead of a duplicate. Consent to call, text or email is never set here: only the person can give it.", write: true, inputSchema: obj({
    name: str("Full name", { minLength: 1, maxLength: 200 }), email: str("Email", { format: "email" }), phone: str("Phone, e.g. +15125550100"), type: str("Default buyer", { enum: TYPES }),
    budget: str("Budget as said, e.g. \"$550k-$600k\""), areas: list("Neighborhoods or cities"), wants: list("Needs and wants, e.g. \"3 bed\", \"home office\""), tags: list("Tags"),
    moving_within_months: str("When they plan to move", { enum: MOVE }), source: str("Where they came from", { enum: ["Zillow", "Facebook Ads", "Instagram", "Website", "Referral", "Open House"] }),
    note: str("First note on their timeline") }, ["name"]) },
  { name: "update_lead", title: "Update a lead", description: "Change a lead's stage, type, next step, budget, areas, wants, tags or moving timeline. Lists replace the old list. A stage change is noted on their timeline.", write: true, inputSchema: obj({
    lead_id: id("lead"), stage: str("New stage", { enum: STAGES }), type: str("Lead type", { enum: TYPES }), next_action: str("The next step, in a sentence"), budget: str("Budget as said"),
    areas: list("Neighborhoods or cities (replaces)"), wants: list("Needs and wants (replaces)"), tags: list("Tags (replaces)"), moving_within_months: str("Moving timeline", { enum: MOVE }) }, ["lead_id"]) },
  { name: "log_activity", title: "Log an activity", description: "Record on a lead's timeline something that already happened: a call, text, email, DM or a note. This only logs; it never sends anything.", write: true, inputSchema: obj({
    lead_id: id("lead"), text: str("What happened", { minLength: 1, maxLength: 4000 }), channel: str("Default Note", { enum: ["Call", "SMS", "WhatsApp", "Email", "Instagram", "Note"] }),
    direction: str("out = the agent reached out, in = the lead did. Default out", { enum: ["in", "out"] }) }, ["lead_id", "text"]) },
  { name: "create_task", title: "Add a task", description: "A to-do with a due time, optionally for a lead. Shows on the agent's Today screen.", write: true, inputSchema: obj({
    title: str("What to do", { minLength: 1, maxLength: 300 }), due_at: str("When, ISO 8601 with offset, e.g. 2026-11-16T10:00:00-06:00", { format: "date-time" }), lead_id: id("lead"),
    kind: str("Default call", { enum: ["call", "video", "email", "showing", "cma"] }), note: str("Details", { maxLength: 2000 }) }, ["title", "due_at"]) },
  { name: "complete_task", title: "Complete a task", description: "Mark a task done (or reopen it with done=false).", write: true, inputSchema: obj({ task_id: id("task"), done: bool("Default true") }, ["task_id"]) },
  { name: "schedule_showing", title: "Book a showing", description: "Book a showing for a lead at one of the team's listings or any address. Moves an early-stage lead to Showing. Not sent to anyone's calendar from here.", write: true, inputSchema: obj({
    lead_id: id("lead"), starts_at: str("Start, ISO 8601 with offset", { format: "date-time" }), listing_id: id("listing"), address: str("Address when it isn't one of the team's listings"),
    minutes: int("Length (10-240, default 30)", { minimum: 10, maximum: 240 }), notes: str("Notes", { maxLength: 2000 }) }, ["lead_id", "starts_at"]) },
  { name: "record_showing_feedback", title: "Record showing feedback", description: "After a showing: how interested the buyer was, a 1-5 rating and what they said. Marks it done and notes it on their timeline (and in the seller's report).", write: true, inputSchema: obj({
    showing_id: id("showing"), interest: str("How interested", { enum: ["not_interested", "maybe", "interested", "offer"] }), rating: int("1-5", { minimum: 1, maximum: 5 }),
    feedback: str("What they said", { maxLength: 2000 }) }, ["showing_id", "interest"]) },
];

export const PROMPTS = [
  { name: "plan_my_day", title: "Plan my day", description: "A short, ordered plan for today from the daily brief.", arguments: [],
    text: "Call daily_brief, then give me a short plan for today in order of urgency: who to reach first and why, by which channel their contact_rules allow, and what to prepare for showings and deal deadlines. Draft nothing yet; ask which ones I want drafts for." },
  { name: "follow_up", title: "Follow up with a lead", description: "Read a lead and draft the next message.", arguments: [{ name: "lead", description: "The lead's name", required: true }],
    text: "Search for the lead \"{lead}\", read them with get_lead, and draft my next follow-up on a channel their contact_rules allow, in their language and my voice, based on their timeline. Check the draft with check_fair_housing. Don't log or send anything." },
  { name: "listing_feedback_report", title: "Seller feedback report", description: "Summarize showings and offers on a listing for the seller.", arguments: [{ name: "address", description: "The listing's address", required: true }],
    text: "Find the listing at \"{address}\", read it with get_listing, and write a short update for the seller: showings so far, what buyers said (no names), interest level, offers with compare_offers, and one honest recommendation." },
];

// ---------------------------------------------------------------------------------------------------------------

export type Rpc = (tool: string, args: Record<string, unknown>) => Promise<unknown>;
export class ToolError extends Error {}

const n = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const must = (v: unknown, name: string) => { if (typeof v !== "number" || !Number.isFinite(v)) throw new ToolError(`${name} must be a number`); return v; };
const r2 = (v: number) => Math.round(v * 100) / 100;
const round = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, r2(v)]));
const today = () => new Date().toISOString().slice(0, 10);

type LeadRow = { type?: string; budget?: string; areas?: string[]; wants?: string[] };
type ListingRow = { id: string; address: string; area?: string; price: number; beds?: number; status: string; est_rent?: number; for?: "sale" | "rent"; features?: string[]; description?: string };
type OfferRow = { id: string; buyer?: string; amount: number; seller_credit?: number; earnest?: number; financing: OfferTerms["financing"]; contingencies?: OfferTerms["contingencies"]; close_on?: string; status: string };
type DealRow = { status: string; close_on?: string; last_client_contact?: string; milestones: { title: string; due_on?: string; done_at?: string }[] };

/** Runs one tool. Data tools go to the database as the user; the rest are computed here. */
export async function callTool(name: string, a: Record<string, unknown>, rpc: Rpc): Promise<unknown> {
  switch (name) {
    case "check_fair_housing": {
      if (typeof a.text !== "string" || !a.text.trim()) throw new ToolError("text is required");
      const flags = checkFairHousing(a.text.slice(0, 20_000));
      return { flags: flags.map(({ phrase, level, why, suggest }) => ({ phrase, level, why, suggest })), clean: flags.length === 0,
        note: "Automated wording check, not legal advice. high = likely violation, review = depends on context, style = MLS preference." };
    }
    case "mortgage_payment": {
      const h = { price: must(a.price, "price"), ratePct: must(a.rate_pct, "rate_pct"), downPct: n(a.down_pct, 20), years: n(a.years, 30), taxPct: n(a.tax_pct, 1.1),
        insurance: n(a.insurance_per_year, 1800), hoa: n(a.hoa_per_month, 0), pmiPct: n(a.pmi_pct, 0.5) };
      const m = monthlyCost(h);
      return { monthly: round({ principal_and_interest: m.pi, property_tax: m.tax, insurance: m.ins, pmi: m.pmi, hoa: m.hoa, total: m.total }), loan: Math.round(m.loan),
        down_payment: Math.round(h.price - m.loan), assumptions: h, note: "Estimate for conversation, not a loan quote or credit decision." };
    }
    case "affordability": {
      const x = { monthlyIncome: must(a.monthly_income, "monthly_income"), monthlyDebts: n(a.monthly_debts, 0), ratePct: must(a.rate_pct, "rate_pct"), downPct: n(a.down_pct, 20),
        years: n(a.years, 30), taxPct: n(a.tax_pct, 1.1), insurance: n(a.insurance_per_year, 1800), hoa: n(a.hoa_per_month, 0), pmiPct: 0.5,
        frontPct: n(a.front_pct, 28), backPct: n(a.back_pct, 36) };
      const r = maxPrice(x);
      return { max_price: r.price, max_monthly_housing: Math.round(r.budget), assumptions: x, note: "Guideline estimate, not a pre-approval. A lender decides." };
    }
    case "rental_analysis": {
      const x = { price: must(a.price, "price"), rent: must(a.rent, "rent"), ratePct: n(a.rate_pct, 7), downPct: n(a.down_pct, 25), years: n(a.years, 30), rehab: n(a.rehab, 0),
        closingPct: n(a.closing_pct, 3), vacancyPct: n(a.vacancy_pct, 5), taxPct: n(a.tax_pct, 1.1), insurance: n(a.insurance_per_year, 1800), hoa: n(a.hoa_per_month, 0),
        mgmtPct: n(a.mgmt_pct, 8), maintenancePct: n(a.maintenance_pct, 8), otherIncome: n(a.other_income, 0), otherExpenses: n(a.other_expenses, 0) };
      const r = analyzeRental(x);
      return { yearly: round({ gross_rent: r.gross, collected: r.collected, operating_expenses: r.opex, noi: r.noi, debt_service: r.debt, cash_flow: r.cashFlow }),
        cap_rate_pct: r2(r.capRate), cash_on_cash_pct: r2(r.cashOnCash), dscr: r.dscr === null ? null : r2(r.dscr), grm: r.grm === null ? null : r2(r.grm),
        meets_one_percent_rule: r.onePercent, cash_needed: Math.round(r.cashIn), assumptions: x, note: "Estimate; verify rent, taxes and insurance locally." };
    }
    case "match_listings": {
      const lead = (await rpc("get_lead", { lead_id: a.lead_id })) as LeadRow & { name: string };
      const listings = (await rpc("list_listings", { limit: 100 })) as ListingRow[];
      const buyer = { type: lead.type, budget: lead.budget ?? "", areas: lead.areas ?? [], preferences: lead.wants ?? [] };
      const ranked = listings
        .map((p) => ({ p, m: matchListing(buyer, { area: p.area ?? "", price: p.price, beds: p.beds ?? 0, status: p.status, estRent: p.est_rent ?? null, listingKind: p.for, features: p.features, description: p.description }) }))
        .filter((x) => x.m)
        .sort((x, y) => y.m!.score - x.m!.score)
        .slice(0, Math.min(20, Math.max(1, n(a.limit, 5))));
      return { lead: lead.name, matches: ranked.map(({ p, m }) => ({ listing_id: p.id, address: p.address, price: p.price, status: p.status, fit: m!.score, why: m!.fits, gaps: m!.gaps })),
        note: ranked.length ? undefined : "No listing fits. The lead may need areas or a budget set (update_lead)." };
    }
    case "compare_offers": {
      const l = (await rpc("get_listing", { listing_id: a.listing_id })) as { address: string; price: number; offers: OfferRow[] };
      const terms: OfferTerms[] = l.offers.map((o) => ({ id: o.id, amount: o.amount, sellerCredit: o.seller_credit ?? 0, earnest: o.earnest ?? 0, financing: o.financing,
        contingencies: o.contingencies ?? [], closeOn: o.close_on ?? null, status: o.status }));
      const best = compareOffers(terms);
      return { address: l.address, list_price: l.price, offers: l.offers.map((o) => ({ ...o, net_to_seller: o.amount - (o.seller_credit ?? 0), strengths: best[o.id] })) };
    }
    case "get_deal": {
      const d = (await rpc("get_deal", a)) as DealRow;
      const ms: Milestone[] = d.milestones.map((m) => ({ title: m.title, dueOn: m.due_on ?? null, doneAt: m.done_at ?? null }));
      const flags = riskFlags({ status: d.status, closeOn: d.close_on ?? null, lastContactOn: d.last_client_contact?.slice(0, 10) ?? null }, ms, today());
      return { ...d, outlook: d.status === "active" ? closeOutlook(flags, ms) : undefined, risks: flags };
    }
    default:
      return rpc(name, a);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// JSON-RPC over Streamable HTTP, stateless: every POST is answered with one JSON body.

type Msg = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
export type Reply = { jsonrpc: "2.0"; id: string | number | null; result?: unknown; error?: { code: number; message: string } };

const ok = (id: Msg["id"], result: unknown): Reply => ({ jsonrpc: "2.0", id: id ?? null, result });
const fail = (id: Msg["id"], code: number, message: string): Reply => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

export function listTools(scope: "read" | "write") {
  return TOOLS.filter((t) => scope === "write" || !t.write).map((t) => ({
    name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema,
    annotations: { title: t.title, readOnlyHint: !t.write, destructiveHint: false, idempotentHint: !t.write, openWorldHint: false },
  }));
}

/** One JSON-RPC message → its reply, or null for a notification. */
export async function handle(msg: Msg, ctx: { scope: "read" | "write"; rpc: Rpc }): Promise<Reply | null> {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return fail(msg?.id, -32600, "Invalid request");
  if (msg.id === undefined) return null; // notifications (initialized, cancelled...) need no answer
  const p = msg.params ?? {};
  switch (msg.method) {
    case "initialize": {
      const asked = typeof p.protocolVersion === "string" ? p.protocolVersion : "";
      return ok(msg.id, { protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS });
    }
    case "ping": return ok(msg.id, {});
    case "tools/list": return ok(msg.id, { tools: listTools(ctx.scope) });
    case "prompts/list": return ok(msg.id, { prompts: PROMPTS.map(({ name, title, description, arguments: args }) => ({ name, title, description, arguments: args })) });
    case "prompts/get": {
      const pr = PROMPTS.find((x) => x.name === p.name);
      if (!pr) return fail(msg.id, -32602, "Unknown prompt");
      const args = (p.arguments ?? {}) as Record<string, string>;
      const missing = pr.arguments.find((x) => x.required && !String(args[x.name] ?? "").trim());
      if (missing) return fail(msg.id, -32602, `Missing argument: ${missing.name}`);
      const text = pr.text.replace(/\{(\w+)\}/g, (_, k) => String(args[k] ?? "").slice(0, 200).replace(/["\n]/g, " "));
      return ok(msg.id, { description: pr.description, messages: [{ role: "user", content: { type: "text", text } }] });
    }
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === p.name);
      if (!tool) return fail(msg.id, -32602, `Unknown tool: ${String(p.name)}`);
      if (tool.write && ctx.scope !== "write") return ok(msg.id, toolResult("This connection is read-only. Make a read and write token in Estos to allow changes.", true));
      const args = p.arguments && typeof p.arguments === "object" && !Array.isArray(p.arguments) ? (p.arguments as Record<string, unknown>) : {};
      try {
        return ok(msg.id, toolResult(await callTool(tool.name, args, ctx.rpc), false));
      } catch (e) {
        if (e instanceof ToolError) return ok(msg.id, toolResult(e.message, true));
        throw e;
      }
    }
    default: return fail(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

function toolResult(data: unknown, isError: boolean) {
  if (isError) return { content: [{ type: "text", text: String(data) }], isError: true };
  const structured = data !== null && typeof data === "object" && !Array.isArray(data) ? data : { items: data };
  return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: structured, isError: false };
}
