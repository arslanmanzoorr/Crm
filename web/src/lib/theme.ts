// The team's theme as CSS variables for the app shell. Inputs are re-validated here because the result is
// written into a <style> tag: only a strict hex color and a known radius name ever reach the CSS.
import { brandColorError } from "./brand.ts";
import { RADII, type Radius } from "./features.ts";

const RADIUS: Record<Radius, { btn: string; card: string }> = {
  pill: { btn: "9999px", card: "24px" },
  rounded: { btn: "12px", card: "16px" },
  square: { btn: "4px", card: "6px" },
};

export function themeCss(color: unknown, radius: unknown): string {
  const vars: string[] = [];
  if (typeof color === "string" && !brandColorError(color)) vars.push(`--color-accent:${color}`, `--color-accent-strong:color-mix(in oklab,${color} 82%,black)`);
  const r = RADII.includes(radius as Radius) && radius !== "pill" ? RADIUS[radius as Radius] : null;
  if (r) vars.push(`--radius-card:${r.card}`, `--radius-btn:${r.btn}`);
  return vars.length ? `:root{${vars.join(";")}}` : "";
}

export { RADIUS };
