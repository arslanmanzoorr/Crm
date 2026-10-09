import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, commission, daysBetween, defaultMilestones, riskFlags } from "./deals.ts";

test("date helpers cross month ends", () => {
  assert.equal(addDays("2026-01-30", 3), "2026-02-02");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(daysBetween("2026-10-01", "2026-10-31"), 30);
});

test("defaultMilestones counts from acceptance and back from closing", () => {
  const ms = defaultMilestones("buyer", "2026-10-01", "2026-10-31");
  assert.deepEqual(ms.map((m) => m.dueOn), ["2026-10-04", "2026-10-11", "2026-10-22", "2026-10-22", "2026-10-26", "2026-10-30", "2026-10-31"]);
  assert.equal(defaultMilestones("seller", "2026-10-01", null).at(-1)!.dueOn, "2026-10-31"); // 30 days by default
  assert.equal(defaultMilestones("seller", "2026-10-01", null)[1].title, "Buyer's Inspection period ends");
  // A 17-day escrow: contingencies clear a week before closing, in order, nothing after closing.
  const short = defaultMilestones("buyer", "2026-09-27", "2026-10-14");
  assert.deepEqual(short.map((m) => m.dueOn), ["2026-09-30", "2026-10-07", "2026-10-07", "2026-10-07", "2026-10-09", "2026-10-13", "2026-10-14"]);
  // A 5-day escrow can't fit them before acceptance: they land the day after.
  assert.equal(defaultMilestones("buyer", "2026-10-01", "2026-10-06")[2].dueOn, "2026-10-02");
});

test("commission: referral off the top, then the split", () => {
  assert.deepEqual(commission(500_000, 3, 70, 25), { gci: 15_000, referral: 3_750, agent: 7_875, brokerage: 3_375 });
  assert.deepEqual(commission(333_333, 2.5, 80, 0), { gci: 8333.33, referral: 0, agent: 6666.66, brokerage: 1666.67 });
});

test("riskFlags explains what could slip", () => {
  const ms = [
    { title: "Earnest money deposited", dueOn: "2026-10-04", doneAt: "2026-10-03T10:00:00Z" },
    { title: "Inspection period ends", dueOn: "2026-10-08", doneAt: null },
    { title: "Appraisal completed", dueOn: "2026-10-11", doneAt: null },
    { title: "Closing", dueOn: "2026-10-15", doneAt: null },
  ];
  const flags = riskFlags({ status: "active", closeOn: "2026-10-15", lastContactOn: "2026-09-28" }, ms, "2026-10-10");
  assert.deepEqual(flags, [
    { level: "high", text: "Inspection period ends was due Oct 8 (2 days overdue)" },
    { level: "medium", text: "Appraisal completed is due tomorrow" },
    { level: "medium", text: "Closing in 5 days with 2 items still open" },
    { level: "medium", text: "No logged contact with the client in 12 days" },
  ]);
  assert.deepEqual(riskFlags({ status: "closed", closeOn: null, lastContactOn: null }, ms, "2026-10-10"), []);
  assert.deepEqual(riskFlags({ status: "active", closeOn: null, lastContactOn: "2026-10-09" }, [], "2026-10-10"), [{ level: "medium", text: "No closing date set" }]);
  assert.equal(riskFlags({ status: "active", closeOn: "2026-10-09", lastContactOn: null }, [], "2026-10-10")[0].level, "high");
});
