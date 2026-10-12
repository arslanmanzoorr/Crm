import assert from "node:assert/strict";
import { test } from "node:test";
import { launchChecklist } from "./launch.ts";

const base = { photos: 12, description: "Sunny three bedroom home with a renovated kitchen, new roof and a big fenced yard. ".repeat(3), approved: true, mlsId: "A1", rent: false, openHouses: 1, promoSent: true };

test("launchChecklist: done only from real facts; rentals skip the MLS step", () => {
  assert.ok(launchChecklist(base).every((s) => s.done));
  const fresh = launchChecklist({ ...base, photos: 3, mlsId: null, openHouses: 0, promoSent: false });
  assert.deepEqual(fresh.filter((s) => !s.done).map((s) => s.key), ["photos", "mls", "openhouse", "promo"]);
  assert.equal(launchChecklist({ ...base, rent: true }).some((s) => s.key === "mls"), false);
});

test("a description with a Fair Housing problem isn't done", () => {
  const s = launchChecklist({ ...base, description: base.description + " Perfect for a young couple, no kids." }).find((x) => x.key === "description")!;
  assert.equal(s.done, false);
  assert.match(s.hint, /to fix/);
});
