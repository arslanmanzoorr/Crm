import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { buildEmail, consentUrl, open, seal } from "./google.ts";

const K = randomBytes(32).toString("base64");

test("seal/open round-trips, and tampering or a wrong key fails", () => {
  const s = seal("1//refresh-token", K);
  assert.equal(open(s, K), "1//refresh-token");
  const parts = s.split(".");
  parts[3] = Buffer.from("x" + Buffer.from(parts[3], "base64url").toString("latin1"), "latin1").toString("base64url");
  assert.throws(() => open(parts.join("."), K));
  assert.throws(() => open(s, randomBytes(32).toString("base64")));
  assert.throws(() => seal("x", Buffer.from("short").toString("base64")));
});

test("buildEmail: no header injection, unicode survives, bad addresses rejected", () => {
  const raw = Buffer.from(buildEmail({ from: "a@b.co", fromName: "Ana Ruíz", to: "c@d.co", subject: "Hi\r\nBcc: evil@x.com", text: "Line 1\nLine 2" }), "base64url").toString("utf8");
  const headers = raw.split("\r\n\r\n")[0];
  assert.ok(!/^Bcc:/m.test(headers));
  assert.match(headers, /^Subject: Hi Bcc: evil@x\.com$/m);
  assert.match(headers, /^From: =\?UTF-8\?B\?/m);
  const body = Buffer.from(raw.split("\r\n\r\n")[1].replace(/\r\n/g, ""), "base64").toString("utf8");
  assert.equal(body, "Line 1\r\nLine 2");
  assert.throws(() => buildEmail({ from: "a@b.co", to: "x@y.co>\r\nBcc: z@z.co", subject: "s", text: "t" }));
});

test("consentUrl asks for offline access with only the needed scopes", () => {
  const u = new URL(consentUrl({ clientId: "id", redirectUri: "http://localhost:3000/api/google/callback", state: "st" }));
  assert.equal(u.searchParams.get("access_type"), "offline");
  assert.equal(u.searchParams.get("state"), "st");
  assert.match(u.searchParams.get("scope")!, /gmail\.send/);
  assert.doesNotMatch(u.searchParams.get("scope")!, /gmail\.readonly|mail\.google\.com/);
});
