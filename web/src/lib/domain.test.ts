import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanDomain, clientPage, domainToken } from "./domain.ts";
import { themeCss } from "./theme.ts";

test("cleanDomain normalises and refuses hosts we can't or shouldn't serve", () => {
  assert.equal(cleanDomain(" https://Homes.Harborpine.com/listings "), "homes.harborpine.com");
  assert.equal(cleanDomain("homes.harborpine.com."), "homes.harborpine.com");
  for (const bad of ["localhost", "10.0.0.1", "my-app.vercel.app", "x.supabase.co", "no_underscores.com", "a..com", "app.example.com"])
    assert.equal(cleanDomain(bad, "app.example.com"), null, bad);
});

test("clientPage recognises only the client-facing pages", () => {
  assert.deepEqual(clientPage("/f/abc/book"), { kind: "form", id: "abc" });
  assert.deepEqual(clientPage("/oh/123"), { kind: "oh", id: "123" });
  assert.deepEqual(clientPage("/p/tok"), { kind: "portal", id: "tok" });
  assert.equal(clientPage("/leads"), null);
  assert.equal(clientPage("/f"), null);
  assert.equal(clientPage("/f/%E0%A4%A"), null);
});

test("domainToken is stable per team and differs between teams", async () => {
  assert.equal(await domainToken("a"), await domainToken("a"));
  assert.notEqual(await domainToken("a"), await domainToken("b"));
  assert.match(await domainToken("a"), /^estos-verify=[0-9a-f]{32}$/);
});

test("themeCss: light and system themes, never on the marketing site", () => {
  assert.match(themeCss(null, "pill", "light"), /^:root:not\(:has\(\[data-site\]\)\)\{color-scheme:light;/);
  assert.match(themeCss(null, "pill", "system"), /^@media \(prefers-color-scheme:light\)/);
  assert.equal(themeCss(null, "pill", "dark"), "");
  assert.equal(themeCss(null, "pill", "neon"), "");
});
