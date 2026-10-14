import assert from "node:assert/strict";
import { test } from "node:test";
import { fill, unknownFields } from "./templates.ts";

test("fill replaces known fields and leaves gaps visible", () => {
  const r = fill("Buyer {{ client_name }} agrees to buy {{property_address}} for {{price}} by {{closing_date}}.", { client_name: "Jane Doe", property_address: "14 Oak Ave", price: "$615,000", closing_date: " " });
  assert.equal(r.text, "Buyer Jane Doe agrees to buy 14 Oak Ave for $615,000 by [Closing date].");
  assert.deepEqual(r.missing, ["Closing date"]);
});

test("unknownFields flags typos once", () => {
  assert.deepEqual(unknownFields("{{client_nme}} {{price}} {{client_nme}}"), ["client_nme"]);
});
