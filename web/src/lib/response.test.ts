import assert from "node:assert/strict";
import { test } from "node:test";
import { fmtWait, responseStats, waitLevel } from "./response.ts";

const at = (min: number) => new Date(Date.UTC(2026, 9, 18, 9, 0) + min * 60_000).toISOString();

test("waitLevel thresholds", () => {
  assert.deepEqual([0, 4.9, 5, 14, 15, 59, 60, 600].map(waitLevel), ["new", "new", "late", "late", "later", "later", "overdue", "overdue"]);
});

test("fmtWait", () => {
  assert.deepEqual([0, 4.7, 60, 125, 1500].map(fmtWait), ["0 min", "4 min", "1 h", "2 h 5 min", "1 d"]);
});

test("responseStats: median of answered, percentages over all leads", () => {
  const s = responseStats([
    { createdAt: at(0), firstResponseAt: at(2) },
    { createdAt: at(0), firstResponseAt: at(10) },
    { createdAt: at(0), firstResponseAt: at(90) },
    { createdAt: at(0), firstResponseAt: null },
  ]);
  assert.deepEqual(s, { leads: 4, answered: 3, waiting: 1, medianMin: 10, within5: 25, within60: 50 });
  assert.deepEqual(responseStats([]), { leads: 0, answered: 0, waiting: 0, medianMin: null, within5: 0, within60: 0 });
});
