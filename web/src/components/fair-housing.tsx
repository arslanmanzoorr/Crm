"use client";

import { Scale } from "lucide-react";
import { useState } from "react";
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
  return (
    <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
      <span className="text-muted">Description</span>
      <textarea name="description" rows={4} value={text} onChange={(e) => setText(e.target.value)} className={`${input} resize-y`} />
      <FairHousingHints text={text} />
    </label>
  );
}
