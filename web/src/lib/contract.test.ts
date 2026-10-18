import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanContract, matchMilestone } from "./contract.ts";

test("cleanContract keeps real dates, drops junk, sorts and dedupes", () => {
  const r = cleanContract({
    accepted_on: "2026-10-01", close_on: "2026-02-30", price: 512000,
    deadlines: [
      { title: "Closing", due_on: "2026-11-14", quote: "Closing shall occur on or before November 14, 2026" },
      { title: "Inspection period ends", due_on: "2026-10-11", quote: "within 10 days" },
      { title: "Inspection period ends", due_on: "2026-10-11", quote: "dup" },
      { title: "Bogus", due_on: "next Tuesday", quote: "" },
      { title: "", due_on: "2026-10-20", quote: "" },
    ],
  });
  assert.equal(r.acceptedOn, "2026-10-01");
  assert.equal(r.closeOn, null); // Feb 30 isn't a date
  assert.equal(r.price, 512000);
  assert.deepEqual(r.deadlines.map((d) => d.title), ["Inspection period ends", "Closing"]);
  assert.deepEqual(cleanContract("nonsense"), { acceptedOn: null, closeOn: null, price: null, deadlines: [] });
});

test("matchMilestone maps contract wording to the standard milestones, once each", () => {
  const ms = [
    { id: "a", title: "Earnest money deposited" }, { id: "b", title: "Buyer's Inspection period ends" },
    { id: "c", title: "Title and escrow cleared" }, { id: "d", title: "Closing" },
  ];
  const used = new Set<string>();
  assert.equal(matchMilestone("Inspection Period expires", ms, used)?.id, "b");
  assert.equal(matchMilestone("Escrow deposit due", ms, used)?.id, "a");
  assert.equal(matchMilestone("Close of escrow", ms, new Set())?.id, "d");
  assert.equal(matchMilestone("Title commitment delivered", ms, new Set())?.id, "c");
  assert.equal(matchMilestone("Settlement date", ms, used)?.id, "d");
  used.add("d");
  assert.equal(matchMilestone("Closing", ms, used), null);
  assert.equal(matchMilestone("HOA documents delivered", ms, used), null);
});
