import assert from "node:assert/strict";
import { test } from "node:test";
import { sellerUpdate } from "./seller-update.ts";

const base = { firstName: "Pat", address: "14 Oak Ave", daysOnMarket: 12, showings: [], openHouseVisitors: 0, offers: [] };

test("busy week with an offer", () => {
  assert.equal(sellerUpdate({
    ...base,
    showings: [{ interest: "interested", feedback: "Loved the yard" }, { interest: "not_interested", feedback: "" }, { interest: null, feedback: "Kitchen feels dated" }],
    openHouseVisitors: 1,
    offers: [{ amount: 610_000, status: "submitted" }, { amount: 625_000, status: "countered" }, { amount: 700_000, status: "rejected" }],
  }), [
    "Hi Pat, here's this week at 14 Oak Ave (12 days on the market):",
    "- 3 showings; 1 of those buyers liked it.",
    '- What buyers said: "Loved the yard"; "Kitchen feels dated".',
    "- 1 visitor at the open house.",
    "- 2 offers in hand, the best at $625,000. Let's talk through them.",
    "Happy to talk anytime.",
  ].join("\n"));
});

test("quiet week suggests a next step", () => {
  assert.match(sellerUpdate(base), /A quiet week: no showings or offers/);
});

test("traffic without offers says so", () => {
  const r = sellerUpdate({ ...base, daysOnMarket: 1, showings: [{ interest: null, feedback: "" }, { interest: null, feedback: "" }, { interest: null, feedback: "" }] });
  assert.match(r, /\(1 day on the market\)/);
  assert.match(r, /Good traffic but no offers yet/);
});
