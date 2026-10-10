import assert from "node:assert/strict";
import { test } from "node:test";
import { conflicts, ics, openSlots, planTour } from "./showings.ts";

const s = (id: string, start: string, end: string, agentId = "a", status = "confirmed") => ({ id, agentId, startsAt: `2026-10-10T${start}:00Z`, endsAt: `2026-10-10T${end}:00Z`, status });

test("conflicts finds overlaps per agent, ignores back-to-back, other agents and cancelled", () => {
  const r = conflicts([
    s("1", "10:00", "10:30"),
    s("2", "10:30", "11:00"),            // back-to-back with 1: fine
    s("3", "10:45", "11:15"),            // overlaps 2
    s("4", "10:00", "12:00", "b"),       // other agent
    s("5", "10:50", "11:10", "a", "cancelled"),
    s("6", "09:00", "13:00", "c"), s("7", "12:00", "12:30", "c"), // 7 inside a long slot
  ]);
  assert.deepEqual([...r].sort(), ["2", "3", "6", "7"]);
});

test("ics escapes text, uses UTC and folds long lines at 75 octets", () => {
  const out = ics({
    uid: "x1", startsAt: "2026-10-10T15:00:00.000Z", endsAt: "2026-10-10T15:30:00.000Z", now: "2026-10-09T00:00:00Z",
    title: "Showing: 14 Oak Ave, Springfield; with Jane", location: "14 Oak Ave, Springfield",
    description: "Lockbox 1234\nCall first. " + "é".repeat(60),
  });
  assert.ok(out.includes("DTSTART:20261010T150000Z\r\n"));
  assert.ok(out.includes("SUMMARY:Showing: 14 Oak Ave\\, Springfield\\; with Jane\r\n"));
  assert.ok(out.includes("Lockbox 1234\\nCall first."));
  for (const line of out.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75, line);
  assert.ok(out.endsWith("END:VCALENDAR\r\n"));
});

test("planTour books homes back to back with travel time between", () => {
  const slots = planTour("2026-10-10T15:00:00.000Z", 3, 30, 15);
  assert.deepEqual(slots.map((s) => [s.startsAt.slice(11, 16), s.endsAt.slice(11, 16)]), [["15:00", "15:30"], ["15:45", "16:15"], ["16:30", "17:00"]]);
  assert.deepEqual(planTour("nope", 3, 30, 15), []);
  assert.equal(planTour("2026-10-10T15:00:00Z", 40, 30, 0).length, 12); // a tour tops out at 12 homes
});

test("openSlots: business hours on the half hour, an hour's notice, taken times removed", () => {
  const now = new Date(2026, 9, 10, 8, 0); // local 8:00
  const all = openSlots(now, [], 1);
  assert.equal(all.length, 18);                                   // 9:00 … 17:30
  assert.deepEqual([all[0].getHours(), all[0].getMinutes()], [9, 0]);
  const busy: [string, string][] = [[new Date(2026, 9, 10, 10, 15).toISOString(), new Date(2026, 9, 10, 10, 45).toISOString()]];
  const left = openSlots(now, busy, 1).map((d) => `${d.getHours()}:${d.getMinutes()}`);
  assert.ok(!left.includes("10:0") && !left.includes("10:30") && left.includes("11:0")); // both overlapping slots gone
  assert.equal(openSlots(new Date(2026, 9, 10, 16, 20), [], 1).length, 1);             // only 17:30 is an hour out
});
