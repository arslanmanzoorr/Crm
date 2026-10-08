"use client";

import { Sparkles, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { analyzeLead, deleteLead, deleteProperty, setStage } from "@/lib/actions";
import { STAGES, type Stage } from "@/lib/data";
import { ActionForm, input } from "./forms";

export function StageSelect({ id, stage }: { id: string; stage: Stage }) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Pipeline stage"
      defaultValue={stage}
      disabled={pending}
      onChange={(e) => start(() => setStage(id, e.target.value as Stage))}
      className={`${input} w-auto`}
    >
      {STAGES.map((s) => <option key={s}>{s}</option>)}
    </select>
  );
}

/** Confirmed delete for a lead or listing. */
export function DeleteButton({ id, what }: { id: string; what: "lead" | "listing" }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => confirm(`Delete this ${what}? This can't be undone.`) && start(() => (what === "lead" ? deleteLead(id) : deleteProperty(id)))}
      className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm text-score-1 hover:bg-surface-3"
    >
      <Trash2 className="size-4" /> Delete
    </button>
  );
}

export function AnalyzeButton({ id }: { id: string }) {
  return (
    <ActionForm action={analyzeLead} className="flex flex-col gap-2">
      {(pending) => (
        <>
          <input type="hidden" name="id" value={id} />
          <button disabled={pending} className="flex w-fit items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-light hover:bg-accent-strong disabled:opacity-60">
            <Sparkles className="size-4" /> {pending ? "Analyzing…" : "Analyze with AI"}
          </button>
        </>
      )}
    </ActionForm>
  );
}
