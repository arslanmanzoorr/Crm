import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanTour, questsFor, STEPS, stepsFor } from "./tour.ts";

test("stepsFor: owners get the team steps, agents don't; switched-off modules are skipped", () => {
  const owner = stepsFor("owner", []).map((s) => s.id);
  const agent = stepsFor("agent", ["inbox"]).map((s) => s.id);
  assert.ok(owner.includes("branding") && owner.includes("modules"));
  assert.ok(!agent.includes("branding") && !agent.includes("inbox"));
  assert.equal(owner.at(-1), "search"); // always ends on search
  assert.equal(stepsFor(undefined, []).length, STEPS.length - 2);
});

test("cleanTour keeps only known shapes", () => {
  assert.deepEqual(cleanTour({ status: "done", step: "ask", x: 1 }), { status: "done", step: "ask" });
  assert.deepEqual(cleanTour({ status: "hacked", step: "nope" }), {});
  assert.deepEqual(cleanTour(null), {});
});

test("questsFor filters by role and modules", () => {
  assert.equal(questsFor("agent", []).length, 6);
  assert.equal(questsFor("owner", ["listings"]).length, 7);
});
