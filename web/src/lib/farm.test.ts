import assert from "node:assert/strict";
import { test } from "node:test";
import { farmNote, farmReport } from "./farm.ts";

const L = (area: string, status: string, price: number, soldOn: string | null = null) => ({ area, status, price, soldOn });
const P = (id: string, lastTouch: string | null, dnc = false) => ({ id, name: id, lastTouch, dnc, email: true });

test("farmReport counts one area (case-insensitive), sold only within 90 days, due skips DNC", () => {
  const r = farmReport("Hyde Park", [
    L("hyde park ", "Active", 500_000), L("Hyde Park", "Active", 700_000), L("Hyde Park", "Under contract", 600_000),
    L("Hyde Park", "Sold", 650_000, "2026-09-01"), L("Hyde Park", "Sold", 400_000, "2026-01-01"), L("Zilker", "Active", 900_000),
  ], [P("a", "2026-10-01"), P("b", "2026-07-01"), P("c", null), P("d", null, true)], "2026-10-10");
  assert.deepEqual([r.active, r.pending, r.sold90, r.medianActive, r.medianSold], [2, 1, 1, 600_000, 650_000]);
  assert.deepEqual(r.due.map((p) => p.id), ["c", "b"]); // never touched first, then oldest
});

test("farmNote only states numbers it has, and keeps the placeholder for personalising", () => {
  const quiet = farmNote("Zilker", farmReport("Zilker", [], [], "2026-10-10"), "Sam");
  assert.match(quiet, /^Hi \{first_name\}, a quick Zilker market note from Sam:/);
  assert.match(quiet, /quiet stretch/);
  assert.doesNotMatch(quiet, /\$/);
  const busy = farmNote("Hyde Park", farmReport("Hyde Park", [L("Hyde Park", "Active", 500_000)], [], "2026-10-10"), "Sam");
  assert.match(busy, /1 home for sale, typically around \$500,000\./);
});
