import assert from "node:assert/strict";
import { test } from "node:test";
import { blockers, scrubbed } from "./consent.ts";

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
