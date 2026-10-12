"use client";

import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { askBusiness } from "@/lib/actions";
import { inputAuto } from "./forms";

const EXAMPLES = ["Which lead source closes best?", "How much is closing in the next 30 days?", "Who responds to new leads fastest?"];

/** Questions about the business, answered from this team's own numbers. */
export function AskBusiness() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ask = (question: string) => start(async () => { setErr(null); const r = await askBusiness(question); if (r.answer) setAnswer(r.answer); else setErr(r.error ?? "Try again."); });
  return (
    <section aria-labelledby="ask" className="flex flex-col gap-3 rounded-card bg-surface-2 p-5">
      <h2 id="ask" className="text-xl">Ask your business</h2>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} aria-label="Question about your business" placeholder="e.g. Which agent closed the most this year?" className={`${inputAuto} min-w-0 flex-1`} />
        <button disabled={pending || !q.trim()} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-surface-3 px-4 text-sm hover:bg-surface-1 disabled:opacity-60">
          <Sparkles aria-hidden className="size-4" />{pending ? "Thinking…" : "Ask"}
        </button>
      </form>
      {!answer && !pending && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((x) => <button key={x} type="button" onClick={() => { setQ(x); ask(x); }} className="min-h-10 rounded-full bg-surface-3 px-3.5 text-xs text-muted hover:text-ink">{x}</button>)}
        </div>
      )}
      {answer && <p aria-live="polite" className="whitespace-pre-line text-sm leading-relaxed">{answer}</p>}
      {err && <p role="alert" className="text-sm text-score-1">{err}</p>}
      <p className="text-xs text-muted">Answers come only from your team&apos;s numbers on this page (last 12 months) and open deals.</p>
    </section>
  );
}
