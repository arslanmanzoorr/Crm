// Financing Readiness, no I/O: what buyer- or lender-provided information is missing. Never a credit judgement:
// it only compares what's been recorded against what the deal needs.
import { daysBetween } from "./deals.ts";

export const DOCS = {
  pay_stubs: "Pay stubs (last 30 days)",
  w2: "W-2s (last 2 years)",
  tax_returns: "Tax returns (last 2 years)",
  bank_statements: "Bank statements (last 2 months)",
  id: "Photo ID",
  gift_letter: "Gift letter (if gifted funds)",
} as const;
export type Doc = keyof typeof DOCS;

export const LOAN_STAGES = {
  not_started: "Not started", preapproved: "Preapproved", application: "Application in", processing: "Processing",
  underwriting: "Underwriting", conditional: "Conditional approval", clear_to_close: "Clear to close", funded: "Funded",
} as const;
export type LoanStage = keyof typeof LOAN_STAGES;

export type Financing = {
  cash: boolean; lender: string | null; stage: LoanStage;
  preapprovalAmount: number | null; preapprovalExpires: string | null; docs: Doc[]; giftFunds: boolean;
};

export type Readiness = { level: "ready" | "gaps" | "blocked"; items: { level: "high" | "medium"; text: string }[]; missingDocs: Doc[] };

/** Compare the buyer's recorded financing with an offer amount and a closing date (both optional). */
export function readiness(f: Financing, ctx: { offerAmount?: number | null; closeOn?: string | null; today: string }): Readiness {
  const items: Readiness["items"] = [];
  const needed = (Object.keys(DOCS) as Doc[]).filter((d) => d !== "gift_letter" || f.giftFunds);
  const missingDocs = f.cash ? [] : needed.filter((d) => !f.docs.includes(d));
  const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  if (f.cash) {
    if (ctx.offerAmount && !f.docs.includes("bank_statements")) items.push({ level: "medium", text: "Cash buyer: get proof of funds before the offer goes out" });
  } else {
    if (!f.lender) items.push({ level: "medium", text: "No lender on file" });
    if (f.preapprovalAmount === null) items.push({ level: ctx.offerAmount ? "high" : "medium", text: "No preapproval recorded" });
    if (f.preapprovalAmount !== null && ctx.offerAmount && ctx.offerAmount > f.preapprovalAmount)
      items.push({ level: "high", text: `Offer ${money(ctx.offerAmount)} is above the ${money(f.preapprovalAmount)} preapproval` });
    if (f.preapprovalExpires) {
      const left = daysBetween(ctx.today, f.preapprovalExpires);
      if (left < 0) items.push({ level: "high", text: "Preapproval has expired; ask the lender to refresh it" });
      else if (ctx.closeOn && f.preapprovalExpires < ctx.closeOn) items.push({ level: "medium", text: "Preapproval expires before the closing date" });
      else if (left <= 14) items.push({ level: "medium", text: `Preapproval expires in ${left} day${left === 1 ? "" : "s"}` });
    }
    if (ctx.closeOn) {
      const toClose = daysBetween(ctx.today, ctx.closeOn);
      if (toClose >= 0 && toClose <= 5 && !["clear_to_close", "funded"].includes(f.stage))
        items.push({ level: "high", text: `Closing in ${toClose} day${toClose === 1 ? "" : "s"} and the loan isn't clear to close (${LOAN_STAGES[f.stage].toLowerCase()})` });
    }
    if (missingDocs.length) items.push({ level: "medium", text: `${missingDocs.length} document${missingDocs.length === 1 ? "" : "s"} still to collect` });
  }
  const level = items.some((i) => i.level === "high") ? "blocked" : items.length ? "gaps" : "ready";
  return { level, items: items.sort((a, b) => (a.level === b.level ? 0 : a.level === "high" ? -1 : 1)), missingDocs };
}
