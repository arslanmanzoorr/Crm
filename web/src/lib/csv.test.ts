import assert from "node:assert/strict";
import { test } from "node:test";
import { guessMapping, parseCsv, toImportRow } from "./csv.ts";

test("parseCsv handles quotes, escaped quotes, embedded commas/newlines, CRLF and BOM", () => {
  const csv = '﻿Name,Notes\r\n"Doe, Jane","said ""hi""\nthen left"\r\nBob,\r\n\r\n';
  assert.deepEqual(parseCsv(csv), [["Name", "Notes"], ["Doe, Jane", 'said "hi"\nthen left'], ["Bob", ""]]);
});

test("parseCsv keeps a last row without trailing newline", () => {
  assert.deepEqual(parseCsv("a,b\n1,2"), [["a", "b"], ["1", "2"]]);
});

test("guessMapping recognises common export headers", () => {
  const m = guessMapping(["First Name", "Last Name", "E-mail 1 - Value", "Mobile Phone", "Lead Source", "Neighborhood"]);
  assert.equal(m.first, 0);
  assert.equal(m.last, 1);
  assert.equal(m.email, 2);
  assert.equal(m.phone, 3);
  assert.equal(m.source, 4);
  assert.equal(m.areas, 5);
  assert.equal(m.name, -1);
});

test("toImportRow joins names, normalises contact info and rejects bad rows", () => {
  const m = guessMapping(["First Name", "Last Name", "Email", "Phone", "Type", "Areas"]);
  assert.deepEqual(toImportRow(["Jane", "Doe", " JANE@X.COM ", "(555) 010-1234", "Seller", "Westside; Oak Park"], m), {
    name: "Jane Doe", email: "jane@x.com", phone: "5550101234", type: "seller", source: "Import", budget: "", areas: ["Westside", "Oak Park"], notes: "",
  });
  assert.deepEqual(toImportRow(["", "", "a@b.co", "", "", ""], m), { error: "Missing name" });
  assert.deepEqual(toImportRow(["Al", "", "", "", "", ""], m), { error: "Needs an email or phone" });
  assert.deepEqual(toImportRow(["Al", "", "nope", "", "", ""], m), { error: "Invalid email “nope”" });
  assert.equal((toImportRow(["Al", "", "", "5551234", "wizard", ""], m) as { type: string }).type, "buyer");
});
