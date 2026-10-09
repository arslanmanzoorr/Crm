import assert from "node:assert/strict";
import { test } from "node:test";
import { checkFairHousing } from "./fairhousing.ts";

test("flags who-should-live-here phrasing, most serious first", () => {
  const f = checkFairHousing("Charming home, perfect for young couples! Master suite upstairs. Exclusive neighborhood. No Section 8.");
  assert.deepEqual(f.map((x) => [x.level, x.phrase]), [
    ["high", "perfect for young couples"],
    ["high", "No Section 8"],
    ["review", "Exclusive neighborhood"],
    ["style", "Master suite"],
  ]);
});

test("property facts pass", () => {
  assert.deepEqual(checkFairHousing("Three bedrooms, family room, black granite counters, walking distance to the park. Primary suite with a soaking tub."), []);
});

test("protected classes", () => {
  const levels = (t: string) => checkFairHousing(t).map((x) => x.level);
  assert.deepEqual(levels("Quiet Christian neighborhood"), ["high"]);
  assert.deepEqual(levels("adults only building"), ["high"]);
  assert.deepEqual(levels("No wheelchairs, sorry"), ["high"]);
  assert.deepEqual(levels("handicap parking"), ["style"]);
  assert.deepEqual(levels("ladies only"), ["high"]);
});
