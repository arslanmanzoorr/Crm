import assert from "node:assert/strict";
import { test } from "node:test";
import { dormant, kindOf, reactivationNote } from "./reactivate.ts";

const L = (id: string, lastTouch: string | null, stage = "Contacted", dnc = false, createdAt = "2026-01-01") =>
  ({ id, name: id, type: "buyer", stage, lastTouch, createdAt, dnc, email: true });

test("dormant: quiet 90+ days, never closed/lost/DNC, untouched leads count from when they arrived, quietest first", () => {
  const r = dormant([
    L("recent", "2026-09-30"), L("old", "2026-06-01"), L("older", "2026-03-01"),
    L("closed", "2026-01-15", "Closed"), L("dnc", "2026-01-15", "New", true), L("never", null, "New", false, "2026-05-01"),
    L("newish", null, "New", false, "2026-09-01"),
  ], "2026-10-12");
  assert.deepEqual(r.map((x) => x.id), ["older", "never", "old"]);
  assert.equal(r[0].idleDays, 225);
});

test("reactivationNote fits the lead type and always offers an easy out", () => {
  assert.match(reactivationNote(kindOf("seller"), "Sam"), /^Hi \{first_name\}, Sam here\. Are you still thinking about selling\?/);
  assert.match(reactivationNote(kindOf("vendor"), "Sam"), /check in/);
  assert.match(reactivationNote("buyer", "Sam"), /won't keep checking in\.$/);
});
