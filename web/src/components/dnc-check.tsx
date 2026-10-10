"use client";

import { useState, useTransition } from "react";
import { markDncChecked } from "@/lib/actions";

const pill = "flex min-h-10 items-center rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60";

/** Cold-call gate: record the registry result. Listed numbers become do-not-contact. */
export function DncCheck({ contactId, lastChecked }: { contactId: string; lastChecked: string | null }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const go = (listed: boolean) => start(async () => { const r = await markDncChecked(contactId, listed); setMsg(r?.error ?? null); });
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-muted">
        To cold-call, check the number at <a href="https://telemarketing.donotcall.gov" target="_blank" rel="noreferrer" className="text-accent underline">the National Do Not Call Registry</a> (and your state list, if it has one)
        {lastChecked ? ` (last checked ${lastChecked}, older than 31 days)` : ""}, then record the result.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => go(false)} className={pill}>Not on the registry</button>
        <button type="button" disabled={pending} onClick={() => go(true)} className={pill}>On the registry</button>
      </div>
      {msg && <p role="alert" className="text-score-1">{msg}</p>}
    </div>
  );
}
