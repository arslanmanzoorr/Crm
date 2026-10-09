import assert from "node:assert/strict";
import { test } from "node:test";
import { adjust, cleanCma, opinion, sellerNet, type Comp } from "./cma.ts";

const subject = { sqft: 1800, beds: 3, baths: 2 };
const rates = { perSqft: 100, perBed: 10_000, perBath: 7_500 };
const comp = (o: Partial<Comp>): Comp => ({ id: "x", address: "1 A St", status: "sold", price: 500_000, sqft: 1800, beds: 3, baths: 2, soldOn: "2026-09-01", dom: 20, adjust: 0, note: "", ...o });

test("adjust moves a comp toward the subject, in plain dollars", () => {
  const a = adjust(subject, comp({ sqft: 1600, beds: 2, baths: 2.5, adjust: -5000 }), rates, "2026-10-09");
  assert.equal(a.sqftAdj, 20_000);   // subject 200 sqft bigger
  assert.equal(a.bedAdj, 10_000);    // subject has one more bed
  assert.equal(a.bathAdj, -3_750);   // subject has half a bath less
  assert.equal(a.total, 21_250);
  assert.equal(a.value, 521_250);
});

test("weights favor similar, recent, sold comps", () => {
  const today = "2026-10-09";
  const close = adjust(subject, comp({}), rates, today).weight;
  assert.ok(close > adjust(subject, comp({ sqft: 2600 }), rates, today).weight);
  assert.ok(close > adjust(subject, comp({ soldOn: "2025-10-01" }), rates, today).weight);
  assert.ok(close > adjust(subject, comp({ status: "active", soldOn: null }), rates, today).weight);
});

test("opinion needs two comps and returns a rounded range around the weighted value", () => {
  assert.equal(opinion(subject, [comp({})], rates, "2026-10-09"), null);
  const o = opinion(subject, [comp({ price: 480_000 }), comp({ price: 500_000 }), comp({ price: 520_000 })], rates, "2026-10-09")!;
  assert.deepEqual(o, { low: 490_000, mid: 500_000, high: 510_000, perSqft: 278, used: 3 });
});

test("sellerNet subtracts commission, closing costs, payoff and concessions", () => {
  assert.deepEqual(sellerNet(500_000, { commissionPct: 5, closingPct: 1.5, payoff: 250_000, concessions: 5_000, other: 1_000 }),
    { price: 500_000, commission: 25_000, closing: 7_500, payoff: 250_000, concessions: 5_000, other: 1_000, net: 211_500 });
});

test("cleanCma accepts good data and names the first problem", () => {
  const good = { subject, rates, net: { commissionPct: 5, closingPct: 1, payoff: 0, concessions: 0, other: 0 }, comps: [{ address: " 2 B St ", status: "pending", price: "510000", sqft: 1700, beds: 3, baths: 2, soldOn: "2026-09-10", dom: "", adjust: 0 }], listPrice: "", notes: "Motivated: relocating" };
  const r = cleanCma(good);
  assert.ok("comps" in r);
  assert.deepEqual(r.comps[0], { id: "0", address: "2 B St", status: "pending", price: 510_000, sqft: 1700, beds: 3, baths: 2, soldOn: "2026-09-10", dom: null, adjust: 0, note: "" });
  assert.equal(r.listPrice, null);
  assert.deepEqual(cleanCma({ ...good, comps: [{ ...good.comps[0], address: "" }] }), { error: "Comp 1: add the address." });
  assert.deepEqual(cleanCma({ ...good, comps: [{ ...good.comps[0], price: -5 }] }), { error: "Comp 1: check the numbers." });
  assert.deepEqual(cleanCma({ ...good, subject: { sqft: "big" } }), { error: "Check the subject home's size, beds and baths." });
});
