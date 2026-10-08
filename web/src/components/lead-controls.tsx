"use client";

import { Check, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { analyzeLead, deleteLead, deleteProperty, setStage } from "@/lib/actions";
import { STAGES, type Stage } from "@/lib/data";
import { ActionForm, input } from "./forms";

export function StageSelect({ id, stage }: { id: string; stage: Stage }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Stage</span>
      <select
        defaultValue={stage}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Stage;
          setErr("");
          start(async () => {
            try {
              await setStage(id, next);
              setSaved(true);
            } catch {
              setErr("Couldn't save the stage. Try again.");
            }
          });
        }}
        className={`${input} min-h-11 w-auto`}
      >
        {STAGES.map((s) => <option key={s}>{s}</option>)}
      </select>
      <span role="status" className="min-w-14 text-xs">
        {pending ? <span className="text-muted">Saving…</span> : saved ? <span className="inline-flex animate-rise items-center gap-1 text-accent"><Check aria-hidden className="size-3.5" />Saved</span> : null}
        {err && <span className="text-score-1">{err}</span>}
      </span>
    </label>
  );
}

/** Two-step delete without a modal: first press arms it for 4 seconds, second press deletes. */
export function DeleteButton({ id, what }: { id: string; what: "lead" | "listing" }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => (armed ? start(() => (what === "lead" ? deleteLead(id) : deleteProperty(id))) : setArmed(true))}
      className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-sm transition duration-200 ${armed ? "bg-score-1 font-medium text-on-light" : "text-score-1 hover:bg-surface-2"}`}
    >
      <Trash2 aria-hidden className="size-4" />
      {pending ? "Deleting…" : armed ? `Press again to delete this ${what}` : `Delete ${what}`}
    </button>
  );
}

export function AnalyzeButton({ id }: { id: string }) {
  return (
    <ActionForm action={analyzeLead} tone="light" className="flex flex-col gap-2">
      {(pending) => (
        <>
          <input type="hidden" name="id" value={id} />
          <button disabled={pending} className="flex min-h-11 w-fit items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-on-light hover:bg-accent-strong disabled:opacity-60">
            <Sparkles aria-hidden className={`size-4 ${pending ? "animate-pulse" : ""}`} /> {pending ? "Reading the timeline…" : "Analyze with AI"}
          </button>
          <p className="text-xs text-on-light/70">Scores the lead from its activity, saves a next step and adds it to your tasks.</p>
        </>
      )}
    </ActionForm>
  );
}
