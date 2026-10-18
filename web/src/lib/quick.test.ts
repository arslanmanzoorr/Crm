import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanQuick } from "./quick.ts";

test("cleanQuick keeps valid actions and drops the rest", () => {
  const out = cleanQuick({ actions: [
    { type: "log", channel: "call", text: "Talked about Oak Ave; she wants a Saturday showing" },
    { type: "task", kind: "showing", text: "Show 14 Oak Ave", date: "2026-10-24", time: "10:00" },
    { type: "task", kind: "nonsense", text: "Follow up", date: "2026-10-23", time: "25:00" },
    { type: "task", text: "Too old", date: "2026-10-01", kind: "call", time: "" },
    { type: "task", text: "Too far", date: "2028-01-01", kind: "call", time: "" },
    { type: "stage", stage: "showing" },
    { type: "stage", stage: "Offer" },
    { type: "delete_everything", text: "x" },
  ] }, "2026-10-18");
  assert.deepEqual(out, [
    { type: "log", channel: "Call", text: "Talked about Oak Ave; she wants a Saturday showing" },
    { type: "task", kind: "showing", text: "Show 14 Oak Ave", date: "2026-10-24", time: "10:00" },
    { type: "task", kind: "call", text: "Follow up", date: "2026-10-23", time: "09:00" },
    { type: "stage", stage: "Showing" },
  ]);
  assert.deepEqual(cleanQuick("junk", "2026-10-18"), []);
});
