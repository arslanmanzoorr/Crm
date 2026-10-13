"use client";

import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { applyProfileUpdates, suggestProfileUpdates } from "@/lib/actions";
import type { Change } from "@/lib/profile-update";

/** "Update from their messages": AI proposes profile changes, each with the lead's own words; the agent picks what to save. */
export function ProfileUpdates({ id }: { id: string }) {
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [pick, setPick] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();
  const btn = "flex min-h-10 w-fit items-center gap-1.5 rounded-full bg-on-light/10 px-3.5 text-sm hover:bg-on-light/15 disabled:opacity-60";
  const toggle = (i: number) => { const n = new Set(pick); if (n.has(i)) n.delete(i); else n.add(i); setPick(n); };
  return (
    <div className="flex flex-col gap-2">
      {!changes && (
        <button type="button" disabled={pending} className={btn} onClick={() => start(async () => {
          setMsg(null);
          const r = await suggestProfileUpdates(id);
          if ("error" in r) setMsg(r);
          else if (!r.changes.length) setMsg({ ok: "Their messages don't change anything in the profile." });
          else { setChanges(r.changes); setPick(new Set(r.changes.map((_, i) => i))); }
        })}><Sparkles aria-hidden className="size-4" />{pending ? "Reading messages…" : "Update from their messages"}</button>
      )}
      {changes && (
        <fieldset className="flex flex-col gap-2 rounded-2xl bg-on-light/5 p-3 text-sm">
          <legend className="sr-only">Suggested profile changes</legend>
          {changes.map((c, i) => (
            <label key={c.field} className="flex items-start gap-2">
              <input type="checkbox" checked={pick.has(i)} onChange={() => toggle(i)} className="mt-1 size-4 shrink-0" />
              <span><span className="font-medium">{c.label}:</span> {c.from} → <span className="font-medium">{c.to}</span>
                <span className="block text-xs text-on-light/70">&ldquo;{c.quote}&rdquo;</span></span>
            </label>
          ))}
          <div className="flex gap-2">
            <button type="button" disabled={pending || !pick.size} className={btn} onClick={() => start(async () => {
              const r = await applyProfileUpdates(id, changes.filter((_, i) => pick.has(i)).map(({ field, value, quote }) => ({ field, value, quote })));
              setMsg(r ?? null);
              if (r?.ok) setChanges(null);
            })}>{pending ? "Saving…" : "Save selected"}</button>
            <button type="button" className={btn} onClick={() => setChanges(null)}>Dismiss</button>
          </div>
        </fieldset>
      )}
      {msg?.error && <p role="alert" className="text-sm text-score-1">{msg.error}</p>}
      {msg?.ok && <p role="status" className="text-sm text-on-light/70">{msg.ok}</p>}
    </div>
  );
}
