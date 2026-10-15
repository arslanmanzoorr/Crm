"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { change, summaryText, type Metric } from "@/lib/summary";

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** This week vs last week, with a plain-text copy to paste into an email or team chat. */
export function WeeklySummary({ metrics, scope }: { metrics: Metric[]; scope: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <section aria-labelledby="week" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="week" className="text-xl">This week</h2>
          <p className="text-sm text-muted">Last 7 days compared with the 7 before, {scope}.</p>
        </div>
        <button type="button" className="flex min-h-10 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1"
          onClick={() => navigator.clipboard.writeText(summaryText(metrics, scope)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>
          {copied ? <Check aria-hidden className="size-4 text-accent-ink" /> : <Copy aria-hidden className="size-4" />} {copied ? "Copied" : "Copy summary"}
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((x) => (
          <div key={x.label} className="rounded-card bg-surface-2 p-4">
            <dt className="text-sm text-muted">{x.label}</dt>
            <dd className="mt-1 text-2xl font-light tabular-nums">{x.money ? money(x.now) : x.now}</dd>
            <dd className={`text-xs ${x.now < x.before ? "text-score-1" : "text-muted"}`}>{change(x)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
