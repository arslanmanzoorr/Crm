import assert from "node:assert/strict";
import { test } from "node:test";
import { allow } from "./rate-limit.ts";

test("allow: max per window, then frees up as the window slides", () => {
  assert.equal(allow("a", 2, 1000, 0), true);
  assert.equal(allow("a", 2, 1000, 10), true);
  assert.equal(allow("a", 2, 1000, 20), false);
  assert.equal(allow("b", 2, 1000, 20), true);
  assert.equal(allow("a", 2, 1000, 1005), true);
});
