import assert from "node:assert/strict";
import { test } from "node:test";
import { checkSuggestions } from "./profile-update.ts";

const cur = { budget: "$500k", areas: ["Midtown"], preferences: ["3 bed"], moveBy: null };
const said = "Hi! We got pre-approved up to $650k. Now looking at Westside and Oak Park.\nWe’d like to move within 2 months.";

test("keeps changes backed by the lead's own words, drops invented or unchanged ones", () => {
  const c = checkSuggestions([
    { field: "budget", value: "Up to $650k", quote: "pre-approved up to $650k" },
    { field: "areas", value: ["Westside", "Oak Park"], quote: "looking at Westside and Oak Park" },
    { field: "moveBy", value: "1-3", quote: "We'd like to move within 2 months" },
    { field: "preferences", value: ["Pool"], quote: "they want a pool" },
    { field: "budget", value: "$700k", quote: "pre-approved up to $650k" },
    { field: "stage", value: "Closed", quote: "Hi!" },
  ], cur, said);
  assert.deepEqual(c.map((x) => [x.field, x.to]), [["budget", "Up to $650k"], ["areas", "Westside, Oak Park"], ["moveBy", "In 1–3 months"]]);
  assert.equal(c[0].from, "$500k");
});

test("unchanged values and bad move-by codes are dropped", () => {
  assert.deepEqual(checkSuggestions([{ field: "areas", value: ["midtown"], quote: "Westside and Oak Park" }, { field: "moveBy", value: "soon", quote: "move within 2 months" }], cur, said), []);
});
