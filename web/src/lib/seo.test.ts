import assert from "node:assert/strict";
import { test } from "node:test";
import { PLANS } from "./plans.ts";
import { jsonLd, llmsTxt, NOT_YET, PUBLIC_PAGES, robotsTxt, software } from "./seo.ts";
import { STORE } from "./store.ts";

test("every public page and playbook is in the sitemap list, once, with a real date", () => {
  const paths = PUBLIC_PAGES.map((p) => p.path);
  assert.equal(new Set(paths).size, paths.length);
  for (const p of ["/welcome", "/pricing", "/store", "/legal/privacy", "/legal/terms"]) assert.ok(paths.includes(p), p);
  for (const s of STORE) assert.ok(paths.includes(`/store/${s.key}`), s.key);
  for (const p of PUBLIC_PAGES) assert.match(p.updated, /^\d{4}-\d{2}-\d{2}$/, p.path);
});

test("robots.txt allows every public page and still blocks the app and secret client links", () => {
  const r = robotsTxt();
  for (const p of PUBLIC_PAGES) assert.ok(r.includes(`Allow: /${p.path.split("/")[1]}\n`), p.path);
  for (const p of ["/api/", "/p/", "/tc/", "/f/"]) assert.ok(r.includes(`Disallow: ${p}\n`), p);
  assert.ok(r.includes("Disallow: /\n") && r.includes("Sitemap: https://estos.app/sitemap.xml"));
  assert.ok(r.includes("User-agent: OAI-SearchBot") && r.includes("Content-Signal: search=yes"));
});

test("structured data prices match the plans, and only the pricing page carries offers", () => {
  const offers = software(true).offers!.offers;
  assert.deepEqual(offers.map((o) => o.price), PLANS.map((p) => p.monthly));
  assert.equal(software(false).offers, undefined);
});

test("JSON-LD can't break out of its script tag", () => {
  const out = jsonLd({ "@type": "Thing", name: "</script><script>alert(1)</script>" });
  assert.ok(!out.includes("</script>"));
  assert.equal(JSON.parse(out)["@graph"][0].name, "</script><script>alert(1)</script>");
});

test("llms.txt names every plan with its price and what isn't built yet; the full version lists every playbook", () => {
  const short = llmsTxt(false), full = llmsTxt(true);
  assert.match(short, /^# Estos\n\n> /);
  for (const p of PLANS) assert.ok(short.includes(`[${p.name}](https://estos.app/pricing#${p.key}): $${p.monthly}`), p.name);
  for (const x of NOT_YET) assert.ok(short.includes(x), x);
  for (const s of STORE) assert.ok(full.includes(`/store/${s.key}`), s.key);
  assert.ok(short.includes("/llms-full.txt"));
});
