import assert from "node:assert/strict";
import { test } from "node:test";
import { delayLabel, STORE, stepText, storeItem } from "./store.ts";

test("delayLabel reads like a person would say it", () => {
  assert.deepEqual([0, 4, 24, 72, 24 * 14, 24 * 45, 24 * 180].map(delayLabel), ["Right away", "After 4 hours", "Day 2", "Day 4", "Week 3", "Week 7", "Month 6"]);
});

test("every real playbook is in the store with a category and no raw placeholders", () => {
  assert.equal(STORE.length, 6);
  for (const s of STORE) {
    assert.ok(s.category && s.when && s.span);
    for (const step of s.steps) assert.doesNotMatch(stepText(step), /\{/);
  }
  assert.equal(storeItem("speed_to_lead")?.span, "7 days");
  assert.equal(storeItem("nope"), undefined);
});
