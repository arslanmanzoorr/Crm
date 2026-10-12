"use client";

import { Scale, Sparkles } from "lucide-react";
import { useState } from "react";
import { askAi } from "@/lib/ai";
import { checkFairHousing } from "@/lib/fairhousing";
import { input } from "./forms";

/** Flags for a piece of listing copy, most serious first. Shows nothing when the copy is clean. */
export function FairHousingHints({ text }: { text: string }) {
  const flags = checkFairHousing(text);
  if (flags.length === 0) return null;
  return (
    <div role="status" className="flex flex-col gap-1.5 rounded-2xl bg-surface-1 p-3 text-xs">
      <p className="flex items-center gap-1.5 font-medium"><Scale aria-hidden className="size-3.5" /> Fair Housing check</p>
      <ul className="flex flex-col gap-1">
        {flags.map((f) => (
          <li key={`${f.index}-${f.phrase}`} className={f.level === "high" ? "text-score-1" : f.level === "review" ? "text-ink/90" : "text-muted"}>
            <span className="font-medium">“{f.phrase}”</span>: {f.why} <span className="text-muted">Try: {f.suggest}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The listing description field with live Fair Housing hints. */
export function DescriptionField({ defaultValue }: { defaultValue?: string }) {
  const [text, setText] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Drafts from what's typed in the form so far; the agent edits, and the Fair Housing check runs on the result.
  async function draft(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form;
    if (!form) return;
    const f = new FormData(form);
    const facts = Object.fromEntries(["listing_kind", "address", "area", "price", "beds", "baths", "sqft", "features", "home_type", "city", "state", "parking", "furnished", "cats_ok", "dogs_ok"]
      .map((k) => [k, String(f.get(k) ?? "").trim()]).filter(([, v]) => v));
    if (!facts.address && !facts.features) { setErr("Add the address and a few features first."); return; }
    setBusy(true); setErr(null);
    try { setText(await askAi("describe", facts)); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="flex flex-col gap-1.5 text-sm sm:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="description" className="text-muted">Description</label>
        <button type="button" onClick={draft} disabled={busy} className="flex min-h-10 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 hover:bg-surface-1 disabled:opacity-60">
          <Sparkles aria-hidden className="size-4" />{busy ? "Writing…" : text ? "Rewrite with AI" : "Write with AI"}
        </button>
      </div>
      <textarea id="description" name="description" rows={busy ? 4 : 6} value={text} onChange={(e) => setText(e.target.value)} className={`${input} resize-y`} />
      {err && <p role="alert" className="text-score-1">{err}</p>}
      {text && !busy && <p className="text-xs text-muted">AI drafts from the facts above. Read it before saving: you&apos;re responsible for what the listing says.</p>}
      <FairHousingHints text={text} />
    </div>
  );
}
