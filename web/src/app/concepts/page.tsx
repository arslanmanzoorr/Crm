import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: { absolute: "Site concepts · EstateOS" }, robots: { index: false } };

const CONCEPTS = [
  { href: "/welcome", k: "A", name: "Lime Night", look: "Dark, the app's own lime accent, Urbanist.", moves: "Hero product shot straightens in 3D on scroll; pinned story swaps product screens; closing line lights up word by word.", swatch: ["#0e0e0e", "#c5f36a", "#262626"] },
  { href: "/concepts/b", k: "B", name: "Daylight Editorial", look: "Light and airy, cobalt accent, Geist.", moves: "Headline rises line by line out of masks; product shot grows to full bleed; vertical scroll pans sideways through the workflow.", swatch: ["#f2f3f5", "#2b59ff", "#0f1115"] },
  { href: "/concepts/c", k: "C", name: "Aurora Depth", look: "Deep teal night, drifting aurora light, glass, Sora.", moves: "Three product layers tilt in 3D with your cursor; feature cards stack as you scroll; aurora drifts slowly behind.", swatch: ["#061317", "#3ee0b0", "#1491b3"] },
  { href: "/concepts/d", k: "D", name: "Signal Mono", look: "Black and white, one signal orange, heavy Bricolage Grotesque.", moves: "Headline drops in letter by letter; the product is revealed through a widening circle; feature panels expand on hover.", swatch: ["#f4f4f4", "#ff4f1a", "#111111"] },
];

export default function Concepts() {
  return (
    <div data-site className="mx-auto max-w-[1100px] px-5 py-16 sm:px-8">
      <h1 className="text-4xl font-light tracking-tight sm:text-5xl">Four directions for the EstateOS website</h1>
      <p className="mt-4 max-w-[60ch] text-ink/70">Each is a live, animated page built with the same real product screens. Open them, scroll slowly, move your mouse. Pick one (or mix: say which parts you like) and I&apos;ll build the full site in that direction.</p>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2">
        {CONCEPTS.map((c) => (
          <li key={c.k}>
            <Link href={c.href} className="group flex h-full flex-col gap-5 rounded-card bg-surface-2 p-7 transition-transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">{c.swatch.map((s) => <span key={s} className="size-7 rounded-full border border-white/10" style={{ background: s }} />)}</div>
                <ArrowUpRight aria-hidden className="size-5 text-ink/50 transition-colors group-hover:text-accent" />
              </div>
              <div>
                <p className="text-sm text-accent">Direction {c.k}</p>
                <h2 className="mt-1 text-2xl">{c.name}</h2>
                <p className="mt-2 text-sm text-ink/80">{c.look}</p>
                <p className="mt-2 text-sm text-ink/60">{c.moves}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
