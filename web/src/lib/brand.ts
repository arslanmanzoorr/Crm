// White-label accent color checks, no I/O. The accent sits behind dark text (buttons) and is used as text on the
// dark background, so it must be light enough for both.

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

/** null = OK. Checked against button text (#111111) and the darkest card surface (#262626). */
export function brandColorError(hex: string): string | null {
  if (!/^#[0-9a-f]{6}$/.test(hex)) return "Use a hex color like #1e88e5.";
  if (contrast(hex, "#111111") < 4.5 || contrast(hex, "#262626") < 4.5) return "That color is too dark to read on the dark pages. Pick a lighter shade.";
  return null;
}
