import assert from "node:assert/strict";
import { test } from "node:test";
import { extractJson } from "./ai-server.ts";

test("extractJson pulls the object out of fenced or chatty replies", () => {
  assert.equal(extractJson('{"a":1}'), '{"a":1}');
  assert.equal(extractJson('```json\n{"a":1}\n```'), '{"a":1}');
  assert.equal(extractJson('Sure! Here it is: {"a":{"b":2}} Hope that helps.'), '{"a":{"b":2}}');
});
