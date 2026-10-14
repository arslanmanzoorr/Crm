import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanFeatures, featureFor, homeLayout } from "./features.ts";
import { themeCss } from "./theme.ts";

test("themeCss: only valid colors and radii reach the CSS", () => {
  assert.equal(themeCss(null, "pill"), "");
  assert.match(themeCss("#7dd3fc", "square"), /--color-accent:#7dd3fc;.*--radius-btn:4px/);
  assert.equal(themeCss("#7dd3fc;}body{display:none", "x"), "");
  assert.equal(themeCss("#1e3a8a", "pill"), ""); // too dark for the dark theme
  assert.doesNotMatch(themeCss("red", "rounded"), /accent/);
});

test("featureFor matches whole path segments", () => {
  assert.equal(featureFor("/deals"), "deals");
  assert.equal(featureFor("/deals/123"), "deals");
  assert.equal(featureFor("/dealsx"), null);
  assert.equal(featureFor("/leads"), null);
  assert.deepEqual(cleanFeatures(["deals", "deals", "nope", 3]), ["deals"]);
});

test("homeLayout: saved order, new sections appended, hidden and switched-off removed", () => {
  const l = homeLayout(["tasks", "bogus", "today"], ["plan"], ["deals"]);
  assert.deepEqual(l.slice(0, 2), ["tasks", "today"]);
  assert.ok(!l.includes("plan") && !l.includes("deals") && l.includes("leads"));
  assert.equal(homeLayout(null, null, []).length, 10);
});
