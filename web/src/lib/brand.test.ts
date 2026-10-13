import assert from "node:assert/strict";
import { test } from "node:test";
import { brandColorError, contrast } from "./brand.ts";

test("contrast matches WCAG for black on white", () => assert.equal(Math.round(contrast("#000000", "#ffffff")), 21));

test("brandColorError: format, too dark, light OK", () => {
  assert.match(brandColorError("blue")!, /hex/);
  assert.match(brandColorError("#1e3a8a")!, /too dark/);
  assert.equal(brandColorError("#c5f36a"), null);
  assert.equal(brandColorError("#7dd3fc"), null);
});
