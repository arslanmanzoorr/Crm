"use client";

import { Check, Copy, Sparkles } from "lucide-react";
import { useState } from "react";
import { askAi } from "@/lib/ai";
import { input } from "./forms";

const pill = "flex min-h-10 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60";
const PLATFORMS = ["Instagram", "Facebook", "LinkedIn"] as const;
const TIPS = ["Getting ready to buy a first home", "Preparing a home to sell", "What happens after an offer is accepted", "Choosing between renting and buying"];

export type BrandFacts = {
  agent: string;
  testimonials: { first: string; body: string }[];
  markets: { area: string; forSale: number; underContract: number; sold90: number; medianAsking: number | null; medianSold: number | null }[];
  year: { year: string; closed: number; buyers: number; sellers: number };
};

/** Posts about the agent rather than a listing, written from the team's own data: client words, area numbers, the year so far, or a general tip. */
export function BrandPosts({ facts }: { facts: BrandFacts }) {
  const themes = [
    ...(facts.testimonials.length ? [["testimonial", "Client testimonial"]] : []),
    ...(facts.markets.length ? [["market", "Market update"]] : []),
    ...(facts.year.closed ? [["year", `${facts.year.year} so far`]] : []),
    ["tip", "Helpful tip"],
  ] as [string, string][];
  const [theme, setTheme] = useState(themes[0][0]);
  const [pick, setPick] = useState(0);
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("Instagram");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const options = theme === "testimonial" ? facts.testimonials.map((t) => `${t.first}: ${t.body.slice(0, 60)}`) : theme === "market" ? facts.markets.map((m) => m.area) : theme === "tip" ? TIPS : [];
  const data = () => ({
    platform, agent: facts.agent,
    theme: theme === "testimonial" ? "client testimonial" : theme === "market" ? "local market update" : theme === "year" ? "the year so far" : `tip: ${TIPS[pick]}`,
    ...(theme === "testimonial" && { testimonial: facts.testimonials[pick] }),
    ...(theme === "market" && { market: facts.markets[pick] }),
    ...(theme === "year" && { year: facts.year }),
  });
  const go = async () => { setBusy(true); setErr(null); try { setText((await askAi("brand", data())).replace(/\*\*/g, "")); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <section aria-labelledby="brand" className="flex max-w-2xl flex-col gap-3 rounded-card bg-surface-2 p-5">
      <div>
        <h2 id="brand" className="text-xl">Brand posts</h2>
        <p className="text-sm text-muted">Posts about you, not a listing. Written only from your own data: client words, area numbers, your year.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm"><span className="text-muted">Theme</span>
          <select value={theme} onChange={(e) => { setTheme(e.target.value); setPick(0); }} className={input}>{themes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        {options.length > 0 && (
          <label className="flex flex-col gap-1 text-sm"><span className="text-muted">{theme === "testimonial" ? "Testimonial" : theme === "market" ? "Area" : "Topic"}</span>
            <select value={pick} onChange={(e) => setPick(Number(e.target.value))} className={input}>{options.map((o, i) => <option key={i} value={i}>{o}</option>)}</select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm"><span className="text-muted">Platform</span>
          <select value={platform} onChange={(e) => setPlatform(e.target.value as (typeof PLATFORMS)[number])} className={input}>{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select>
        </label>
      </div>
      <button type="button" onClick={go} disabled={busy} className={`${pill} w-fit`}><Sparkles aria-hidden className="size-4" />{busy ? "Writing…" : text ? "Rewrite" : "Write a post"}</button>
      {text && (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} aria-label="Brand post" className={`${input} resize-y`} />
          <button type="button" className={`${pill} w-fit`} onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>
            {copied ? <Check aria-hidden className="size-4 text-accent" /> : <Copy aria-hidden className="size-4" />}{copied ? "Copied" : "Copy"}
          </button>
        </>
      )}
      {err && <p role="alert" className="text-sm text-score-1">{err}</p>}
    </section>
  );
}
