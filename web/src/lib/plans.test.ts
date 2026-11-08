import assert from "node:assert/strict";
import { test } from "node:test";
import { allows, capabilityFor, isPlan, NEEDS, price } from "./plans.ts";

test("each plan includes exactly the capabilities of its tier and below", () => {
  assert.ok(!allows("starter", "ai") && !allows("starter", "email") && !allows("starter", "chatAssistant"));
  assert.ok(allows("pro", "ai") && allows("pro", "email") && !allows("pro", "routing") && !allows("pro", "whiteLabel"));
  for (const cap of Object.keys(NEEDS) as (keyof typeof NEEDS)[]) assert.ok(allows("team", cap), cap);
});

test("paid pages map to their capability, nothing else does", () => {
  assert.equal(capabilityFor("/email"), "email");
  assert.equal(capabilityFor("/email/abc"), "email");
  assert.equal(capabilityFor("/api/publish"), "marketing");
  assert.equal(capabilityFor("/agency"), "agency");
  assert.equal(capabilityFor("/emailx"), null);
  assert.equal(capabilityFor("/leads"), null);
});

test("prices and plan names", () => {
  assert.equal(price(29, false), 29);
  assert.equal(price(29, true), 290); // yearly = 10 months
  assert.ok(isPlan("pro") && !isPlan("solo") && !isPlan(undefined));
});
