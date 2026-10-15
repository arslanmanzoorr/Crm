// The team's theme as CSS variables for the app shell. Inputs are re-validated here because the result is
// written into a <style> tag: only a strict hex color and a known radius name ever reach the CSS.
import { brandColorError } from "./brand.ts";
import { RADII, THEMES, type Radius, type Theme } from "./features.ts";

const RADIUS: Record<Radius, { btn: string; card: string }> = {
  pill: { btn: "9999px", card: "24px" },
  rounded: { btn: "12px", card: "16px" },
  square: { btn: "4px", card: "6px" },
};

// Light palette: same roles as the dark one. Muted text is ≥5:1 on every light surface; score reds/oranges are
// darkened because they double as error text; accent text is mixed toward black so a pale accent stays readable.
export const LIGHT_VARS: Record<string, string> = {
  "--color-bg": "#f2f2f2", "--color-surface-1": "#f8f8f8", "--color-surface-2": "#ffffff", "--color-surface-3": "#e9e9e9",
  "--color-surface-light": "#e4e4e4", "--color-ink": "#141414", "--color-muted": "#5c5c5c", "--color-line": "#000000",
  "--color-score-1": "#c0392b", "--color-score-2": "#b45309", "--color-accent-ink": "color-mix(in oklab,var(--color-accent) 32%,#111111)",
};
// The dark palette from globals.css, for previews shown inside a page that may itself be light.
export const DARK_VARS: Record<string, string> = {
  "--color-bg": "#0e0e0e", "--color-surface-1": "#1a1a1a", "--color-surface-2": "#262626", "--color-surface-3": "#333333",
  "--color-surface-light": "#ededed", "--color-ink": "#f5f5f5", "--color-muted": "#a3a3a3", "--color-line": "#ffffff",
  "--color-score-1": "#f2766b", "--color-score-2": "#f5a25d", "--color-accent-ink": "var(--color-accent)",
};
const LIGHT = ["color-scheme:light", ...Object.entries(LIGHT_VARS).map(([k, v]) => `${k}:${v}`)].join(";");
// The marketing pages carry their own palette, so the app theme stays off them.
const ROOT = ":root:not(:has([data-site]))";

export function themeCss(color: unknown, radius: unknown, theme: unknown = "dark"): string {
  const vars: string[] = [];
  if (typeof color === "string" && !brandColorError(color)) vars.push(`--color-accent:${color}`, `--color-accent-strong:color-mix(in oklab,${color} 82%,black)`);
  const r = RADII.includes(radius as Radius) && radius !== "pill" ? RADIUS[radius as Radius] : null;
  if (r) vars.push(`--radius-card:${r.card}`, `--radius-btn:${r.btn}`);
  const t = THEMES.includes(theme as Theme) ? (theme as Theme) : "dark";
  const light = t === "light" ? `${ROOT}{${LIGHT}}` : t === "system" ? `@media (prefers-color-scheme:light){${ROOT}{${LIGHT}}}` : "";
  return (vars.length ? `:root{${vars.join(";")}}` : "") + light;
}

export { RADIUS };
