"use client";

import { useState, useTransition } from "react";
import { tcToggleMilestone } from "@/lib/actions";

type M = { id: string; title: string; due_on: string | null; done: boolean };
const day = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** The coordinator's checklist: ticking saves straight to the deal. */
export function TcMilestones({ token, milestones }: { token: string; milestones: M[] }) {
  const [items, setItems] = useState(milestones);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!items.length) return <p className="text-sm text-muted">No milestones on this deal yet.</p>;
  return (
    <>
      <ul className="flex flex-col divide-y divide-line/5 overflow-hidden rounded-card bg-surface-2">
        {items.map((m) => (
          <li key={m.id}>
            <label className="flex min-h-12 items-center gap-3 px-5 py-2 text-sm">
              <input type="checkbox" checked={m.done} disabled={pending} className="size-5 shrink-0 accent-[var(--color-accent)]"
                onChange={(e) => {
                  const done = e.target.checked;
                  const set = (v: boolean) => setItems((xs) => xs.map((x) => (x.id === m.id ? { ...x, done: v } : x)));
                  set(done);
                  start(async () => {
                    if (await tcToggleMilestone(token, m.id, done)) setErr(null);
                    else { set(!done); setErr("Couldn't save that. The link may have been turned off."); }
                  });
                }} />
              <span className={`flex-1 ${m.done ? "text-muted line-through" : ""}`}>{m.title}</span>
              {m.due_on && <span className="text-xs text-muted">due {day(m.due_on)}</span>}
            </label>
          </li>
        ))}
      </ul>
      {err && <p role="alert" className="text-sm text-score-1">{err}</p>}
    </>
  );
}
