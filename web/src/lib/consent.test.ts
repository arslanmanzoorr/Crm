import assert from "node:assert/strict";
import { test } from "node:test";
import { blockers, scrubbed, outsideHours } from "./consent.ts";

const T = "2026-10-10";
const none = { call: false, sms: false, email: false, dnc: false };

test("scrubbed: within 31 days only, never future-dated", () => {
  assert.equal(scrubbed("2026-10-10", T), true);
  assert.equal(scrubbed("2026-09-10", T), true);   // 30 days
  assert.equal(scrubbed("2026-09-09", T), false);  // 31 days: rescrub
  assert.equal(scrubbed("2026-10-11", T), false);
  assert.equal(scrubbed(null, T), false);
});

test("a registry check unlocks calls only: not texts, and never a do-not-contact lead", () => {
  const b = blockers({ ...none, dncCheckedOn: "2026-10-01" }, "5125550100", "", T);
  assert.deepEqual(b, { call: null, sms: "no SMS consent", email: "no email address" });
  assert.equal(blockers({ ...none, dnc: true, dncCheckedOn: T }, "5125550100", "", T).call, "marked do not contact");
  assert.equal(blockers(none, "5125550100", "", T).call, "no call consent");
});

test("calling hours: blocks calls and texts outside the window, never wider than 8am-9pm, email unaffected", () => {
  const c = { call: true, sms: true, email: true, dnc: false };
  assert.equal(blockers(c, "+1", "a@b.c", "2026-10-14", { start: 9, end: 20, hour: 8 }).call, "outside calling hours (9am–8pm)");
  assert.equal(blockers(c, "+1", "a@b.c", "2026-10-14", { start: 9, end: 20, hour: 8 }).email, null);
  assert.equal(blockers(c, "+1", "a@b.c", "2026-10-14", { start: 9, end: 20, hour: 19 }).sms, null);
  assert.equal(outsideHours({ start: 6, end: 23, hour: 22 }), "outside calling hours (8am–9pm)");
  assert.equal(outsideHours({ start: 8, end: 21, hour: 21 }), "outside calling hours (8am–9pm)");
  assert.equal(blockers({ ...c, dnc: true }, "+1", "", "2026-10-14", { start: 8, end: 21, hour: 3 }).call, "marked do not contact");
});
