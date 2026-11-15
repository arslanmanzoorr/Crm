import assert from "node:assert/strict";
import { test } from "node:test";
import { PLANS } from "./plans.ts";
import { jsonLd, llmsTxt, PUBLIC_PAGES, software } from "./seo.ts";
import { STORE } from "./store.ts";

test("every public page and playbook is in the sitemap list, once", () => {
  const paths = PUBLIC_PAGES.map((p) => p.path);
  assert.equal(new Set(paths).size, paths.length);
  for (const p of ["/welcome", "/pricing", "/store", "/legal/privacy", "/legal/terms"]) assert.ok(paths.includes(p), p);
  for (const s of STORE) assert.ok(paths.includes(`/store/${s.key}`), s.key);
});

test("structured data prices match the plans", () => {
  assert.deepEqual(software.offers.map((o) => o.price), PLANS.map((p) => p.monthly));
});

test("JSON-LD can't break out of its script tag", () => {
  const out = jsonLd({ "@type": "Thing", name: "</script><script>alert(1)</script>" });
  assert.ok(!out.includes("</script>"));
  assert.equal(JSON.parse(out)["@graph"][0].name, "</script><script>alert(1)</script>");
});

test("llms.txt names every plan with its price; the full version lists every playbook", () => {
  const short = llmsTxt(false), full = llmsTxt(true);
  assert.match(short, /^# Estos\n\n> /);
  for (const p of PLANS) assert.ok(short.includes(`**${p.name}**: $${p.monthly}`), p.name);
  for (const s of STORE) assert.ok(full.includes(`/store/${s.key}`), s.key);
  assert.ok(short.includes("/llms-full.txt"));
});
