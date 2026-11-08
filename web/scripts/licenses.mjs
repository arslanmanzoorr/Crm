// Writes src/lib/licenses.json: every production dependency with its license, for /legal/open-source.
// Run after changing dependencies: npm run licenses
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const raw = JSON.parse(execSync("npx --yes license-checker-rseidelsohn --production --json --excludePrivatePackages", { encoding: "utf8", maxBuffer: 1 << 26 }));
const list = Object.entries(raw)
  .map(([id, v]) => { const at = id.lastIndexOf("@"); return { name: id.slice(0, at), version: id.slice(at + 1), license: String(v.licenses), url: v.repository ?? null }; })
  .filter((p) => !p.name.startsWith("@img/sharp-") || p.name === "@img/sharp-libvips-linux-x64") // platform builds: keep one entry
  .sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(new URL("../src/lib/licenses.json", import.meta.url), JSON.stringify(list, null, 1) + "\n");
console.log(list.length, "packages");
