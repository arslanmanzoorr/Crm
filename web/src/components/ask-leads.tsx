"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Dictate } from "./dictate";
import { askLeads } from "@/lib/actions";
import { inputAuto } from "./forms";

/** Plain-English search over leads; the AI only fills in the page's own filters. */
export function AskLeads({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form data-tour="ask" className="flex flex-col gap-1.5" onSubmit={(e) => { e.preventDefault(); start(async () => { setErr(null); const r = await askLeads(q); if (r.url) router.push(r.url); else setErr(r.error ?? "Try again."); }); }}>
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={200} aria-label="Ask about your leads"
          placeholder="Ask: buyers in Westside nobody's called in 30 days" className={`${inputAuto} min-w-0 flex-1`} />
        <Dictate onText={setQ} label="Speak your question about leads" />
        <button disabled={pending || !q.trim()} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-sm hover:bg-surface-3 disabled:opacity-60">
          <Sparkles aria-hidden className="size-4" />{pending ? "Asking…" : "Ask"}
        </button>
      </div>
      {err && <p role="alert" className="text-sm text-score-1">{err}</p>}
    </form>
  );
}
