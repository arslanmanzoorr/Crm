import assert from "node:assert/strict";
import { test } from "node:test";
import { readiness, type Financing } from "./readiness.ts";

const today = "2026-10-09";
const f = (o: Partial<Financing>): Financing => ({
  cash: false, lender: "Acme Lending", stage: "preapproved", preapprovalAmount: 600_000, preapprovalExpires: "2026-12-31",
  docs: ["pay_stubs", "w2", "tax_returns", "bank_statements", "id"], giftFunds: false, ...o,
});

test("fully documented and preapproved above the offer is ready", () => {
  assert.deepEqual(readiness(f({}), { offerAmount: 580_000, closeOn: "2026-11-20", today }), { level: "ready", items: [], missingDocs: [] });
});

test("offer above preapproval blocks; missing docs and lender are gaps", () => {
  const r = readiness(f({ lender: null, docs: ["id"], giftFunds: true }), { offerAmount: 625_000, today });
  assert.equal(r.level, "blocked");
  assert.deepEqual(r.items.map((i) => i.text), [
    "Offer $625,000 is above the $600,000 preapproval",
    "No lender on file",
    "5 documents still to collect",
  ]);
  assert.ok(r.missingDocs.includes("gift_letter"));
});

test("expiry checks: expired, before closing, soon", () => {
  assert.equal(readiness(f({ preapprovalExpires: "2026-10-01" }), { today }).items[0].text, "Preapproval has expired; ask the lender to refresh it");
  assert.equal(readiness(f({ preapprovalExpires: "2026-11-01" }), { closeOn: "2026-11-15", today }).items[0].text, "Preapproval expires before the closing date");
  assert.equal(readiness(f({ preapprovalExpires: "2026-10-19" }), { today }).items[0].text, "Preapproval expires in 10 days");
});

test("near closing the loan must be clear to close", () => {
  const r = readiness(f({ stage: "underwriting" }), { closeOn: "2026-10-12", today });
  assert.equal(r.items[0].text, "Closing in 3 days and the loan isn't clear to close (underwriting)");
  assert.equal(readiness(f({ stage: "clear_to_close" }), { closeOn: "2026-10-12", today }).level, "ready");
});

test("cash buyers need proof of funds, not a lender", () => {
  const r = readiness(f({ cash: true, lender: null, preapprovalAmount: null, docs: [] }), { offerAmount: 500_000, today });
  assert.deepEqual(r.items.map((i) => i.text), ["Cash buyer: get proof of funds before the offer goes out"]);
  assert.equal(r.level, "gaps");
});
