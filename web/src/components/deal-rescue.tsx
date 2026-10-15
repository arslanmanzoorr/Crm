"use client";

import { LifeBuoy } from "lucide-react";
import { useState } from "react";
import { askAi } from "@/lib/ai";

/** Deal Rescue: an AI plan to unstick a deal with problems, plus a calm note to the client. On demand only. */
export function DealRescue({ data }: { data: unknown }) {
  const [plan, setPlan] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => { setBusy(true); setErr(null); try { setPlan((await askAi("rescue", data)).replace(/\*\*/g, "")); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <div className="flex flex-col gap-2 border-t border-line/10 pt-3">
      <button type="button" onClick={go} disabled={busy} className="flex min-h-10 w-fit items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60">
        <LifeBuoy aria-hidden className="size-4" />{busy ? "Working out a plan…" : plan ? "New rescue plan" : "Rescue plan"}
      </button>
      {plan && <p className="whitespace-pre-line text-sm leading-relaxed">{plan}</p>}
      {err && <p role="alert" className="text-sm text-score-1">{err}</p>}
    </div>
  );
}
