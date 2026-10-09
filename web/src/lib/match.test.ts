import assert from "node:assert/strict";
import { test } from "node:test";
import { matchListing, minBeds, parseBudget } from "./match.ts";

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
