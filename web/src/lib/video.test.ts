import assert from "node:assert/strict";
import { test } from "node:test";
import { coverRect, slideAt } from "./video.ts";

test("slideAt walks photos then hits the end card", () => {
  assert.deepEqual(slideAt(0, 2), { index: 0, progress: 0 });
  assert.deepEqual(slideAt(4.5, 2), { index: 1, progress: 0.5 });
  assert.equal(slideAt(6, 2), null);
});

test("coverRect always covers the canvas, even fully panned", () => {
  for (const pan of [-1, 0, 1]) {
    const r = coverRect(4000, 3000, 720, 1280, 1.1, pan);
    assert.ok(r.x <= 0 && r.y <= 0 && r.x + r.w >= 720 && r.y + r.h >= 1280);
  }
});
