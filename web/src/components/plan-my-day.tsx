"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { askAi } from "@/lib/ai";

/** On-demand AI plan for the day from what's already on this page (costs nothing until clicked). */
export function PlanMyDay({ data }: { data: unknown }) {
  const [plan, setPlan] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => { setBusy(true); setErr(null); try { setPlan(await askAi("plan", data)); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <section aria-labelledby="plan" className="flex flex-col gap-3 rounded-card bg-surface-2 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="plan" className="text-xl">Your plan for today</h2>
        <button type="button" onClick={go} disabled={busy} className="flex min-h-10 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60">
          <Sparkles aria-hidden className="size-4" />{busy ? "Planning…" : plan ? "Plan again" : "Plan my day"}
        </button>
      </div>
      {plan ? <p className="whitespace-pre-line text-sm leading-relaxed">{plan}</p> : !busy && <p className="text-sm text-muted">AI reads your tasks, hot leads, showings and deals and puts them in order.</p>}
      {err && <p role="alert" className="text-sm text-score-1">{err}</p>}
    </section>
  );
}
