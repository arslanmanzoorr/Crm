import { Check, Minus } from "lucide-react";
import type { Match } from "@/lib/match";

/** Why a buyer and a listing fit: what matches, then what doesn't. `fitsOnly` for client-facing views (gaps are agent notes). */
export function MatchReasons({ m, fitsOnly = false }: { m: Match; fitsOnly?: boolean }) {
  if (fitsOnly && m.fits.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label={fitsOnly ? "Why it fits" : `Match ${m.score} out of 100`}>
      {m.fits.map((f) => <li key={f} className="flex items-center gap-1 text-ink/80"><Check aria-hidden className="size-3.5 text-accent" />{f}</li>)}
      {!fitsOnly && m.gaps.map((g) => <li key={g} className="flex items-center gap-1 text-muted"><Minus aria-hidden className="size-3.5" />{g}</li>)}
    </ul>
  );
}
