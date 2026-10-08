import assert from "node:assert/strict";
import { test } from "node:test";
import { likeSafe } from "./search.ts";

test("likeSafe keeps plain text and lowercases it", () => {
  assert.equal(likeSafe("  West  Side "), "west side");
});

test("likeSafe strips wildcards, escapes and filter syntax", () => {
  assert.equal(likeSafe('a%b_c*d\\e,f(g)h"i'), "a b c d e f g h i");
  assert.equal(likeSafe("x,or(id.neq.0)"), "x or id.neq.0");
});

test("likeSafe caps length", () => {
  assert.equal(likeSafe("a".repeat(200)).length, 80);
});
