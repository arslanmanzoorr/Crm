import assert from "node:assert/strict";
import { test } from "node:test";
import { checkUrl, syndicationSteps } from "./syndication.ts";

test("checkUrl searches one portal for the exact address", () => {
  assert.equal(checkUrl("zillow.com", "14 Oak Ave", "Westside"), "https://www.google.com/search?q=site%3Azillow.com%20%2214%20Oak%20Ave%22%20Westside");
});

test("syndicationSteps: approval and MLS number first; nothing left once both are done", () => {
  assert.deepEqual(syndicationSteps({ approved: false, mlsId: null, status: "Active" }).length, 2);
  assert.deepEqual(syndicationSteps({ approved: true, mlsId: "A123", status: "Active" }), []);
  assert.match(syndicationSteps({ approved: true, mlsId: "A123", status: "Coming soon" })[0], /pre-market/);
});
