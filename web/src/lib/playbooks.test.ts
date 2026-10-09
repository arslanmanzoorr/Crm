import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanSteps, TEMPLATES, TRIGGERS, whenLabel } from "./playbooks.ts";

test("every template is valid as-is", () => {
  for (const t of TEMPLATES) {
    assert.ok(t.trigger in TRIGGERS, t.key);
    const r = cleanSteps(t.steps);
    assert.ok("steps" in r, `${t.key}: ${"error" in r ? r.error : ""}`);
  }
});

test("cleanSteps validates and normalizes", () => {
  assert.deepEqual(cleanSteps([{ after_hours: "4", kind: "task", task_kind: "sms?", title: "  Call  ", note: "x" }]),
    { steps: [{ after_hours: 4, kind: "task", task_kind: "call", title: "Call", note: "x" }] });
  assert.deepEqual(cleanSteps([{ after_hours: 0, kind: "tag", tag: "  Past Client " }]), { steps: [{ after_hours: 0, kind: "tag", tag: "past client" }] });
  assert.deepEqual(cleanSteps([]), { error: "Add at least one step." });
  assert.deepEqual(cleanSteps([{ after_hours: -1, kind: "task", title: "x" }]), { error: "Step 1: delay must be 0 to 8760 hours." });
  assert.deepEqual(cleanSteps([{ after_hours: 1, kind: "task", title: " " }]), { error: "Step 1: give the task a title." });
  assert.deepEqual(cleanSteps([{ after_hours: 1, kind: "email_blast" }]), { error: "Step 1: unknown step type." });
  assert.deepEqual(cleanSteps("nope"), { error: "Add at least one step." });
});

test("whenLabel", () => {
  assert.equal(whenLabel(0), "Right away");
  assert.equal(whenLabel(4), "4 hours later");
  assert.equal(whenLabel(48), "2 days later");
  assert.equal(whenLabel(30), "30 hours later");
});
