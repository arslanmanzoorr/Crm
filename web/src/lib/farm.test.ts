import assert from "node:assert/strict";
import { test } from "node:test";
import { campaignResults, farmNote, farmReport, homeUpdate, listingNote } from "./farm.ts";

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

test("listingNote: each kind says what it is, open house carries the time", () => {
  const p = { address: "14 Oak Ave", price: 525_000, beds: 3, baths: 2, area: "Hyde Park" };
  assert.match(listingNote("just_listed", p, "Sam"), /^Hi \{first_name\}, Sam here\. Just listed: 14 Oak Ave in Hyde Park\. 3 bed, 2 bath, \$525,000\./);
  assert.match(listingNote("open_house", p, "Sam", "Sat, Oct 12, 1:00 PM"), /Open house at 14 Oak Ave in Hyde Park on Sat, Oct 12, 1:00 PM\./);
  assert.match(listingNote("just_sold", { ...p, area: "" }, "Sam"), /Just sold: 14 Oak Ave \(listed at \$525,000\)\./);
});

test("campaignResults: replies count only after the send and within the window", () => {
  const r = campaignResults([
    { contactId: "a", content: "Just listed sent:\nHi Ann", ts: "2026-10-01T10:00:00Z" },
    { contactId: "b", content: "Just listed sent:\nHi Bo", ts: "2026-10-01T10:00:00Z" },
    { contactId: "c", content: "Market note sent:\nHi Cy", ts: "2026-10-01T10:00:00Z" },
    { contactId: "c", content: "Called, left voicemail", ts: "2026-10-01T10:00:00Z" },
  ], [
    { contactId: "a", ts: "2026-10-02T09:00:00Z" },  // replied next day
    { contactId: "b", ts: "2026-09-30T09:00:00Z" },  // before the send: not a reply
    { contactId: "c", ts: "2026-10-20T09:00:00Z" },  // 19 days later: outside the window
  ]);
  assert.deepEqual(r, [{ campaign: "Just listed", sent: 2, replied: 1 }, { campaign: "Market note", sent: 1, replied: 0 }]);
});

test("homeUpdate: equity change only when both prices are known; area lines only with numbers", () => {
  const r = farmReport("Hyde Park", [L("Hyde Park", "Active", 500_000)], [], "2026-10-10");
  const up = homeUpdate({ address: "9 Elm St", valueEstimate: 460_000, purchasePrice: 400_000 }, "Hyde Park", r, "Sam");
  assert.match(up, /around \$460,000 today, up about 15% since you bought\./);
  assert.match(up, /In Hyde Park: 1 home for sale, typically around \$500,000\./);
  const bare = homeUpdate({ address: "9 Elm St", valueEstimate: null, purchasePrice: 400_000 }, null, null, "Sam");
  assert.doesNotMatch(bare, /\$/);
  assert.match(bare, /^Hi \{first_name\}, Sam here with a quick update on 9 Elm St\.\nThinking about/);
});
