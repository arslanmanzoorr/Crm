import assert from "node:assert/strict";
import { test } from "node:test";
import { compareOffers, netOf, type OfferTerms } from "./offers.ts";

const base: OfferTerms = { id: "a", amount: 600_000, sellerCredit: 0, earnest: 10_000, financing: "conventional", contingencies: ["inspection", "appraisal", "financing"], closeOn: "2026-11-15", status: "submitted" };

test("netOf subtracts seller credits", () => {
  assert.equal(netOf({ ...base, sellerCredit: 15_000 }), 585_000);
});

test("compareOffers labels strict winners in plain words", () => {
  const offers: OfferTerms[] = [
    { ...base, id: "a", amount: 615_000, sellerCredit: 20_000 },                      // highest price, but credits
    { ...base, id: "b", amount: 600_000, financing: "cash", contingencies: ["inspection"], earnest: 30_000, closeOn: "2026-10-30" },
    { ...base, id: "c", amount: 605_000 },                                            // highest net
    { ...base, id: "d", amount: 700_000, status: "withdrawn" },                       // ignored
  ];
  assert.deepEqual(compareOffers(offers), {
    a: ["Highest price"],
    b: ["Fewest contingencies", "Largest earnest money", "Fastest close", "Cash, no lender"],
    c: ["Highest net"],
    d: [],
  });
});

test("no labels with a single live offer, and ties earn nothing", () => {
  assert.deepEqual(compareOffers([base, { ...base, id: "x", status: "rejected" }]), { a: [], x: [] });
  const tie = compareOffers([base, { ...base, id: "b" }]);
  assert.deepEqual(tie, { a: [], b: [] });
});

test("highest price is dropped when the same offer also nets the most", () => {
  const r = compareOffers([{ ...base, amount: 650_000 }, { ...base, id: "b" }]);
  assert.deepEqual(r.a, ["Highest net"]);
});
