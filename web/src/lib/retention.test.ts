import assert from "node:assert/strict";
import { test } from "node:test";
import { agenda, cadence, health, type PastClient } from "./retention.ts";

const c = (o: Partial<PastClient>): PastClient => ({
  contactId: "c", name: "Jane", dealId: "d", side: "buyer", address: "14 Oak Ave", closedOn: "2026-01-10",
  lastTouchOn: null, reviewAskedOn: null, hasTestimonial: false, activeDeal: false, ...o,
});

test("cadence tightens right after closing", () => {
  assert.equal(cadence(10), 30);
  assert.equal(cadence(200), 90);
});

test("health compares quiet days with the cadence", () => {
  assert.equal(health(c({ closedOn: "2026-01-10", lastTouchOn: "2026-09-01" }), "2026-10-09").health, "good");
  assert.equal(health(c({ closedOn: "2026-01-10", lastTouchOn: "2026-06-01" }), "2026-10-09").health, "due");      // 130 quiet days, cadence 90
  assert.equal(health(c({ closedOn: "2025-01-10", lastTouchOn: null }), "2026-10-09").health, "overdue");
  assert.equal(health(c({ closedOn: "2026-10-01" }), "2026-10-09").nextOn, "2026-10-31");                         // 30 days after closing
});

test("agenda: anniversaries, check-ins, review asks and repeat nudges", () => {
  const items = agenda([
    c({ contactId: "a", name: "Ann", closedOn: "2023-10-15", lastTouchOn: "2026-09-20" }),          // 3rd anniversary in 6 days
    c({ contactId: "b", name: "Bo", closedOn: "2026-10-04", side: "seller", address: "1 Elm" }),    // fresh closing: review ask
    c({ contactId: "d", name: "Dee", closedOn: "2020-03-01", lastTouchOn: "2026-10-01" }),          // 6 years owned: repeat
    c({ contactId: "e", name: "Eve", closedOn: "2025-12-01", lastTouchOn: "2026-05-01" }),          // overdue check-in
  ], "2026-10-09");
  assert.deepEqual(items.map((i) => [i.name, i.kind, i.dueOn]), [
    ["Bo", "review", "2026-10-09"],
    ["Dee", "repeat", "2026-10-09"],
    ["Eve", "checkin", "2026-10-09"],
    ["Ann", "anniversary", "2026-10-15"],
  ]); // Bo's first check-in (Nov 3) is past the 14-day horizon, so it isn't listed yet
  assert.equal(items.find((i) => i.kind === "anniversary")!.text, "3rd home anniversary at 14 Oak Ave (3 years since closing)");
  assert.equal(items.find((i) => i.kind === "checkin")!.text, "Check in: no contact in 161 days");
});

test("no review ask once asked or with a testimonial; no repeat nudge during an active deal", () => {
  const today = "2026-10-09";
  assert.equal(agenda([c({ closedOn: "2026-10-01", reviewAskedOn: "2026-10-02" })], today).some((i) => i.kind === "review"), false);
  assert.equal(agenda([c({ closedOn: "2026-10-01", hasTestimonial: true })], today).some((i) => i.kind === "review"), false);
  assert.equal(agenda([c({ closedOn: "2019-01-01", activeDeal: true, lastTouchOn: today })], today).some((i) => i.kind === "repeat"), false);
});

test("leap-day closings get their anniversary on Feb 28 in other years", () => {
  const items = agenda([c({ closedOn: "2024-02-29", lastTouchOn: "2027-01-25" })], "2027-02-20");
  assert.equal(items.find((i) => i.kind === "anniversary")?.dueOn, "2027-02-28");
});

test("an anniversary drops off once we've reached out for it", () => {
  const ann = c({ closedOn: "2023-10-15", lastTouchOn: "2026-09-20" });
  assert.ok(agenda([ann], "2026-10-09").some((i) => i.kind === "anniversary"));
  assert.ok(!agenda([{ ...ann, lastTouchOn: "2026-10-09" }], "2026-10-09").some((i) => i.kind === "anniversary"));
});
