// Modules an owner can switch off for the whole team, and the dashboard sections each person can reorder or hide.
// Plain module (no "use client") so the proxy, server pages and client components all read the same values.

export const FEATURES = [
  { key: "listings", label: "Listings", paths: ["/properties", "/cma"] },
  { key: "showings", label: "Showings", paths: ["/showings"] },
  { key: "deals", label: "Deals", paths: ["/deals", "/offers"] },
  { key: "inbox", label: "Inbox", paths: ["/inbox"] },
  { key: "clients", label: "Past clients", paths: ["/clients"] },
  { key: "analytics", label: "Analytics", paths: ["/analytics"] },
  { key: "tools", label: "Calculators", paths: ["/tools"] },
  { key: "automations", label: "Automations", paths: ["/automations", "/templates"] },
  { key: "farm", label: "Farming", paths: ["/farm"] },
  { key: "marketing", label: "Video and social posts", paths: ["/studio", "/publish"] },
  { key: "partners", label: "Partners", paths: ["/partners"] },
  { key: "email", label: "Email newsletters", paths: ["/email"] },
  { key: "tour", label: "First-run tour", paths: [] },
] as const;
export type Feature = (typeof FEATURES)[number]["key"];

const KEYS = new Set<string>(FEATURES.map((f) => f.key));
export const cleanFeatures = (v: unknown): Feature[] => (Array.isArray(v) ? [...new Set(v.filter((k): k is Feature => typeof k === "string" && KEYS.has(k)))] : []);

/** The module that owns a path, if any (exact segment match, so /dealsx is not /deals). */
export function featureFor(path: string): Feature | null {
  for (const f of FEATURES) if (f.paths.some((p) => path === p || path.startsWith(p + "/"))) return f.key;
  return null;
}

export const RADII = ["pill", "rounded", "square"] as const;
export const THEMES = ["dark", "light", "system"] as const;
export type Theme = (typeof THEMES)[number];
export type Radius = (typeof RADII)[number];

/** Today page sections, in default order. `needs` hides a section when its module is off. */
export const SECTIONS = [
  { key: "waiting", label: "New leads waiting for a reply" },
  { key: "quests", label: "Getting started", needs: "tour" },
  { key: "today", label: "Who to call today" },
  { key: "plan", label: "AI day plan" },
  { key: "signals", label: "Buying signals" },
  { key: "drops", label: "Saved homes with price drops", needs: "listings" },
  { key: "showings", label: "Showings, next 24 hours", needs: "showings" },
  { key: "deals", label: "Deals that need you", needs: "deals" },
  { key: "expiring", label: "Listings expiring soon", needs: "listings" },
  { key: "keep", label: "Keep in touch", needs: "clients" },
  { key: "leads", label: "Top leads" },
  { key: "tasks", label: "Tasks" },
] as const satisfies readonly { key: string; label: string; needs?: Feature }[];
export type Section = (typeof SECTIONS)[number]["key"];

const SKEYS = new Set<string>(SECTIONS.map((s) => s.key));
const cleanSections = (v: unknown): Section[] => (Array.isArray(v) ? [...new Set(v.filter((k): k is Section => typeof k === "string" && SKEYS.has(k)))] : []);

/** Saved order first, then any section added since, minus hidden and switched-off ones. */
export function homeLayout(order: unknown, hidden: unknown, off: readonly string[]): Section[] {
  const saved = cleanSections(order);
  // Sections added after someone saved their layout go in at their default position, so a new urgent section
  // (like "waiting") shows near the top instead of at the bottom.
  const rank = (k: string) => SECTIONS.findIndex((s) => s.key === k);
  const all: Section[] = [...saved];
  SECTIONS.forEach((s, i) => {
    if (saved.includes(s.key)) return;
    const at = all.findIndex((k) => rank(k) > i);
    all.splice(at < 0 ? all.length : at, 0, s.key);
  });
  const hide = new Set<string>(cleanSections(hidden));
  return all.filter((k) => !hide.has(k)).filter((k) => {
    const s = SECTIONS.find((x) => x.key === k) as { needs?: string } | undefined;
    return !s?.needs || !off.includes(s.needs);
  });
}
export { cleanSections };
