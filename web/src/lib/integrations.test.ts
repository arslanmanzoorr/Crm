import assert from "node:assert/strict";
import { test } from "node:test";
import { integrationStatus } from "./integrations.ts";

test("integrationStatus reports names of missing variables only, never values", () => {
  const s = integrationStatus({ SITE_URL: "https://x.test", FORM_RPC_KEY: "secret", FORM_IP_SALT: " ", OPENROUTER_API_KEY: "sk-or-1" });
  const by = Object.fromEntries(s.map((x) => [x.name, x]));
  assert.equal(by["Site address"].connected, true);
  assert.deepEqual(by["Public forms"].missing, ["FORM_IP_SALT"]); // blank counts as missing
  assert.equal(by["AI (OpenRouter)"].connected, true);
  assert.ok(!JSON.stringify(s).includes("secret") && !JSON.stringify(s).includes("sk-or-1"));
});
