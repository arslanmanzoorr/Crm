import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { bodyHtml, cleanAudience, fill, readUnsubToken, renderEmail, unsubToken, validFrom, verifyWebhook } from "./email.ts";

test("bodyHtml escapes everything, then applies the few allowed marks", () => {
  const h = bodyHtml("# Market update\n\nPrices **up** 3%. <script>x</script>\n\n- One\n- Two\n\nSee [listings](https://x.com/a) or [bad](javascript:alert(1))");
  assert.match(h, /<h2[^>]*>Market update<\/h2>/);
  assert.match(h, /<strong>up<\/strong>/);
  assert.match(h, /&lt;script&gt;x&lt;\/script&gt;/);
  assert.match(h, /<ul[^>]*><li[^>]*>One<\/li><li[^>]*>Two<\/li><\/ul>/);
  assert.match(h, /<a href="https:\/\/x.com\/a"/);
  assert.doesNotMatch(h, /href="javascript/);
});

test("bodyHtml: a heading directly followed by bullets, and text right after a list", () => {
  const h = bodyHtml("# Westside\n- 3 for sale\n- 1 sold\nThat's it.\nThanks");
  assert.equal(h, '<h2 style="margin:24px 0 8px;font-size:20px;line-height:1.3">Westside</h2><ul style="margin:0 0 16px;padding-left:20px"><li style="margin:0 0 6px">3 for sale</li><li style="margin:0 0 6px">1 sold</li></ul><p style="margin:0 0 16px">That&#39;s it.<br>Thanks</p>');
});

test("fill and renderEmail: fields, escaped values, footer with address and unsubscribe", () => {
  assert.equal(fill("Hi {{first_name}}{{unknown}}", { first_name: "Maya" }), "Hi Maya{{unknown}}");
  assert.equal(fill("Hi {first_name} from {{ team }}", { first_name: "Maya", team: "H&P" }), "Hi Maya from H&P");
  const r = renderEmail({ subject: "Hi {{first_name}}", body: "Hello {{first_name}}", vars: { first_name: "<b>Maya</b>" }, brand: { team: "Harbor & Pine", color: "#c5f36a", logo: null, address: "1 Main St, Austin TX" }, unsubscribeUrl: "https://x.co/u/abc" });
  assert.equal(r.subject, "Hi <b>Maya</b>");
  assert.match(r.html, /Hello &lt;b&gt;Maya&lt;\/b&gt;/);
  assert.match(r.html, /Harbor &amp; Pine<br>1 Main St, Austin TX/);
  assert.match(r.html, /href="https:\/\/x.co\/u\/abc"[^>]*>Unsubscribe/);
  assert.match(r.text, /Unsubscribe: https:\/\/x.co\/u\/abc/);
});

test("unsubscribe tokens can't be forged", () => {
  const id = "11111111-2222-3333-4444-555555555555";
  const t = unsubToken(id, "secret");
  assert.equal(readUnsubToken(t, "secret"), id);
  assert.equal(readUnsubToken(t, "other"), null);
  assert.equal(readUnsubToken(`${id}.AAAA`, "secret"), null);
  assert.equal(readUnsubToken("junk", "secret"), null);
});

test("cleanAudience keeps known values only", () => {
  assert.deepEqual(cleanAudience({ types: ["buyer", "alien"], stages: ["New", "Nope"], tags: ["hot", "<x>"], pastClients: "yes" }, ["New", "Closed"]),
    { types: ["buyer"], stages: ["New"], tags: ["hot"], pastClients: false });
});

test("verifyWebhook accepts a correct Svix signature only, within 5 minutes", () => {
  const secret = "whsec_" + Buffer.from("k3y").toString("base64"), body = '{"type":"email.opened"}', ts = "1760000000";
  const sig = createHmac("sha256", "k3y").update(`msg_1.${ts}.${body}`).digest("base64");
  assert.equal(verifyWebhook(secret, "msg_1", ts, body, `v1,${sig}`, 1760000000_000), true);
  assert.equal(verifyWebhook(secret, "msg_1", ts, body + " ", `v1,${sig}`, 1760000000_000), false);
  assert.equal(verifyWebhook(secret, "msg_1", ts, body, `v1,${sig}`, 1760000900_000), false);
});

test("validFrom", () => {
  assert.equal(validFrom("hello@harborpine.com"), true);
  assert.equal(validFrom("Name <x@y.com>"), false);
  assert.equal(validFrom("nope"), false);
});
