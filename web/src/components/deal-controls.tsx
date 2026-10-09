"use client";

import { Check, X } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { addMilestone, deleteMilestone, setDealStatus, setMilestoneDate, setMilestoneDone } from "@/lib/actions";
import type { DealMilestone } from "@/lib/db";
import { ActionForm, inputAuto, primaryBtn } from "./forms";

/** One checklist step: tick it off, move its date, or drop it. */
export function MilestoneRow({ m, overdue }: { m: DealMilestone; overdue: boolean }) {
  const [done, setDone] = useOptimistic(!!m.doneAt);
  const [, start] = useTransition();
  return (
    <li className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <button type="button" role="checkbox" aria-checked={done} aria-label={`${m.title} done`}
        onClick={() => start(async () => { setDone(!done); await setMilestoneDone(m.id, !done); })}
        className={`grid size-7 shrink-0 place-items-center rounded-full border-2 transition duration-200 ${done ? "border-accent bg-accent text-on-light" : "border-white/25 hover:border-accent"}`}>
        {done && <Check aria-hidden className="size-4" strokeWidth={3} />}
      </button>
      <span className={`min-w-0 flex-1 basis-[calc(100%-2.5rem)] sm:basis-0 ${done ? "text-muted line-through" : ""}`}>{m.title}</span>
      <input type="date" defaultValue={m.dueOn ?? ""} aria-label={`${m.title} due date`}
        onChange={(e) => start(() => setMilestoneDate(m.id, e.target.value))}
        className={`${inputAuto} ml-10 min-h-10 py-1.5 sm:ml-0 ${overdue && !done ? "text-score-1 ring-1 ring-score-1" : ""}`} />
      <button type="button" aria-label={`Remove ${m.title}`} onClick={() => start(() => deleteMilestone(m.id))}
        className="ml-auto grid size-10 place-items-center rounded-full text-muted hover:bg-surface-3 hover:text-ink sm:ml-0">
        <X aria-hidden className="size-4" />
      </button>
    </li>
  );
}

export function AddMilestone({ dealId }: { dealId: string }) {
  return (
    <ActionForm action={addMilestone} className="flex flex-wrap items-start gap-2">
      {(pending) => (
        <>
          <input type="hidden" name="deal_id" value={dealId} />
          <input name="title" required maxLength={200} placeholder="Add a step, e.g. HOA documents received" aria-label="Step" className={`${inputAuto} min-w-48 flex-1`} />
          <input name="due_on" type="date" aria-label="Due" className={inputAuto} />
          <button disabled={pending} className={primaryBtn}>{pending ? "…" : "Add"}</button>
        </>
      )}
    </ActionForm>
  );
}

/** Close, drop or reopen. Closing and dropping ask for a second press. */
export function DealStatus({ id, status }: { id: string; status: "active" | "closed" | "fell_through" }) {
  const [armed, setArmed] = useState<"closed" | "fell_through" | null>(null);
  const [pending, start] = useTransition();
  const go = (s: "active" | "closed" | "fell_through") => start(async () => { await setDealStatus(id, s); setArmed(null); });
  if (status !== "active")
    return (
      <button type="button" disabled={pending} onClick={() => go("active")} className="min-h-11 rounded-full bg-surface-2 px-5 text-sm hover:bg-surface-3">
        {pending ? "…" : "Reopen deal"}
      </button>
    );
  return (
    <div className="flex flex-wrap gap-2" onBlur={() => setArmed(null)}>
      <button type="button" disabled={pending} onClick={() => (armed === "closed" ? go("closed") : setArmed("closed"))} className={primaryBtn}>
        {pending && armed === "closed" ? "Closing…" : armed === "closed" ? "Press again: mark closed" : "Mark closed"}
      </button>
      <button type="button" disabled={pending} onClick={() => (armed === "fell_through" ? go("fell_through") : setArmed("fell_through"))}
        className={`min-h-11 rounded-full px-5 text-sm transition duration-200 ${armed === "fell_through" ? "bg-score-1 font-medium text-on-light" : "text-score-1 hover:bg-surface-2"}`}>
        {armed === "fell_through" ? "Press again: fell through" : "Fell through"}
      </button>
    </div>
  );
}
