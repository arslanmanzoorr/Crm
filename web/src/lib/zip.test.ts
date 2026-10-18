import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { inflateRawSync } from "node:zlib";
import { toCsv, ZipWriter } from "./zip.ts";

test("ZipWriter output is a valid zip with the right contents", () => {
  const z = new ZipWriter(new Date(2026, 9, 18, 12, 30, 10));
  const parts = [z.add("leads.csv", "name\r\nMaya Okonkwo"), z.add("docs/ünïcode.pdf", new Uint8Array([37, 80, 68, 70])), z.finish()];
  const buf = Buffer.concat(parts);
  assert.equal(buf.readUInt32LE(0), 0x04034b50);
  // First entry: deflated, and inflates back to the original text.
  const nameLen = buf.readUInt16LE(26), csize = buf.readUInt32LE(18);
  assert.equal(inflateRawSync(buf.subarray(30 + nameLen, 30 + nameLen + csize)).toString(), "name\r\nMaya Okonkwo");
  // End record lists both entries.
  assert.equal(buf.readUInt16LE(buf.length - 22 + 10), 2);
  // An independent reader agrees (Python's zipfile verifies every CRC), when Python is installed.
  const dir = mkdtempSync(join(tmpdir(), "zip-"));
  writeFileSync(join(dir, "t.zip"), buf);
  try {
    const out = execFileSync("python", ["-c", "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(z.testzip(),sorted(z.namelist()))", join(dir, "t.zip")], { encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
    assert.match(out, /^None \['docs\/ünïcode\.pdf', 'leads\.csv'\]/);
  } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
});

test("toCsv quotes, flattens objects and defuses formulas", () => {
  assert.equal(toCsv([{ a: "x,y", b: { k: 1 } }, { a: "=HYPERLINK(1)", c: null }]), 'a,b,c\r\n"x,y","{""k"":1}",\r\n\'=HYPERLINK(1),,');
});
