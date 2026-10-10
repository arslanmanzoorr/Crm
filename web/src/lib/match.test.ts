import assert from "node:assert/strict";
import { test } from "node:test";
import { matchListing, minBeds, minCapRate, parseBudget, quickCapRate } from "./match.ts";

test("parseBudget reads the ways agents write budgets", () => {
  assert.deepEqual(parseBudget("$600k–$650k"), { min: 600_000, max: 650_000 });
  assert.deepEqual(parseBudget("≤ $350k"), { max: 350_000 });
  assert.deepEqual(parseBudget("$400k–$900k cash"), { min: 400_000, max: 900_000 });
  assert.deepEqual(parseBudget("up to 1.2M"), { max: 1_200_000 });
  assert.deepEqual(parseBudget("500,000"), { max: 500_000 });
  assert.deepEqual(parseBudget("$300k+"), { min: 300_000 });
  assert.deepEqual(parseBudget("3 bed, flexible"), {});
  assert.deepEqual(parseBudget(""), {});
});

test("minBeds", () => {
  assert.equal(minBeds(["Big yard", "3 bed"]), 3);
  assert.equal(minBeds(["4+ beds"]), 4);
  assert.equal(minBeds(["2br condo"]), 2);
  assert.equal(minBeds(["Quiet street"]), undefined);
});

test("matchListing filters, scores and explains", () => {
  const buyer = { type: "buyer", budget: "$600k–$650k", areas: ["Westside"], preferences: ["3 bed"] };
  const home = { area: "westside ", price: 640_000, beds: 3, status: "Active" };
  assert.deepEqual(matchListing(buyer, home), { score: 100, fits: ["In westside", "Within budget", "3 beds (wants 3+)"], gaps: [] });

  assert.equal(matchListing(buyer, { ...home, area: "Downtown" }), null);
  assert.equal(matchListing(buyer, { ...home, price: 800_000 }), null); // > 10% over
  assert.equal(matchListing(buyer, { ...home, status: "Sold" }), null);
  assert.equal(matchListing({ ...buyer, type: "seller" }, home), null);

  const stretch = matchListing(buyer, { ...home, price: 700_000 })!;
  assert.equal(stretch.score, 80);
  assert.deepEqual(stretch.gaps, ["$50k over budget"]);

  const small = matchListing(buyer, { ...home, beds: 2 })!;
  assert.equal(small.score, 75);
  assert.deepEqual(small.gaps, ["2 beds, wants 3"]);
  assert.equal(matchListing(buyer, { ...home, beds: 1 }), null); // 2+ bedrooms short

  assert.equal(matchListing({ type: "buyer", budget: "", areas: [], preferences: [] }, home), null); // nothing known
  assert.deepEqual(matchListing({ type: "buyer", budget: "", areas: ["Westside"], preferences: [] }, home), { score: 80, fits: ["In westside"], gaps: ["No budget set"] });
});

test("investors: cap rate wants are read and checked against the rent estimate", () => {
  assert.equal(minCapRate(["Duplex", "Cap rate > 6%"]), 6);
  assert.equal(minCapRate(["7.5% cap or better"]), 7.5);
  assert.equal(minCapRate(["Quiet street"]), undefined);
  // 300k, 2,600/mo: collected 29,640; NOI = 29,640 - 3,300 - 1,200 - 4,742.4 = 20,397.6 -> 6.80%
  assert.equal(quickCapRate(300_000, 2600).toFixed(2), "6.80");
  const inv = { type: "investor", budget: "$250k–$400k", areas: ["Riverside"], preferences: ["Cap rate > 6%"] };
  const home = { area: "Riverside", price: 300_000, beds: 4, status: "Active" };
  assert.deepEqual(matchListing(inv, { ...home, estRent: 2600 })!.fits, ["In Riverside", "Within budget", "≈6.8% cap rate (wants 6%+)"]);
  assert.deepEqual(matchListing(inv, { ...home, estRent: 2200 })!.gaps, ["≈5.5% cap rate, wants 6%"]);
  assert.equal(matchListing(inv, { ...home, estRent: 1500 }), null);
  assert.deepEqual(matchListing(inv, home)!.gaps, ["No rent estimate to check the cap rate"]);
});

test("rentals match renters only, on a monthly budget; sales never match renters", () => {
  const rental = { area: "Westside", price: 2400, beds: 2, status: "Active", listingKind: "rent" as const };
  const renter = { type: "renter", budget: "up to $2,500/mo", areas: ["Westside"], preferences: [] };
  const buyer = { type: "buyer", budget: "$600k", areas: ["Westside"], preferences: [] };
  assert.ok(matchListing(renter, rental));
  assert.equal(matchListing(buyer, rental), null);
  assert.equal(matchListing(renter, { ...rental, price: 600_000, listingKind: "sale" }), null);
  assert.ok(matchListing(renter, { ...rental, price: 2700 })!.gaps.length > 0); // a stretch over the monthly budget is flagged
  assert.equal(matchListing(renter, { ...rental, price: 3500 }), null);        // far over: no match
});
