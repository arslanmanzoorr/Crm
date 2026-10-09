"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteWorkflow, installPlaybook, retryRun, saveWorkflow, setWorkflowEnabled } from "@/lib/actions";
import { STAGES } from "@/lib/data";
import { TRIGGERS, type Trigger } from "@/lib/playbooks";
import { ActionForm, input, inputAuto, primaryBtn } from "./forms";

const pill = "flex min-h-10 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60";

export function InstallPlaybook({ templateKey }: { templateKey: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} className={primaryBtn} onClick={() => start(async () => { const r = await installPlaybook(templateKey); setMsg(r?.error ?? null); })}>
        {pending ? "Turning on…" : "Turn on"}
      </button>
      {msg && <span role="alert" className="text-sm text-score-1">{msg}</span>}
    </span>
  );
}

export function WorkflowToggle({ id, enabled, name }: { id: string; enabled: boolean; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" role="switch" aria-checked={enabled} aria-label={`${name} on`} disabled={pending}
      onClick={() => start(() => setWorkflowEnabled(id, !enabled))}
      className={`relative h-7 w-12 shrink-0 rounded-full transition duration-200 ${enabled ? "bg-accent" : "bg-surface-3"}`}>
      <span aria-hidden className={`absolute top-1 size-5 rounded-full bg-white transition-all duration-200 ${enabled ? "left-6" : "left-1"}`} />
    </button>
  );
}

export function DeleteWorkflow({ id, name }: { id: string; name: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onBlur={() => setArmed(false)} aria-label={armed ? `Press again to delete ${name}` : `Delete ${name}`}
      onClick={() => (armed ? start(() => deleteWorkflow(id)) : setArmed(true))}
      className={`flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm ${armed ? "bg-score-1 font-medium text-on-light" : "text-muted hover:bg-surface-3 hover:text-score-1"}`}>
      <Trash2 aria-hidden className="size-4" />{armed && "Delete and stop pending steps?"}
    </button>
  );
}

export function RetryRun({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return <button type="button" disabled={pending} className={pill} onClick={() => start(() => retryRun(id))}>{pending ? "…" : "Retry"}</button>;
}

type DraftStep = { id: number; amount: number; unit: "hours" | "days"; kind: "task" | "tag"; task_kind: string; title: string; note: string; tag: string };
const CONDITIONS: Record<Trigger, { key: string; label: string; options: [string, string][] } | null> = {
  lead_created: { key: "type", label: "Only for", options: [["", "Any lead"], ["buyer", "Buyers"], ["seller", "Sellers"], ["investor", "Investors"], ["renter", "Renters"]] },
  stage_changed: { key: "stage", label: "When the stage becomes", options: STAGES.map((s) => [s, s]) },
  showing_feedback: { key: "interest", label: "When they were", options: [["", "Any feedback"], ["interested", "Interested"], ["maybe", "On the fence"], ["offer", "Wanting to offer"], ["not_interested", "Not interested"]] },
  open_house_visit: { key: "has_agent", label: "Visitors", options: [["", "All visitors"], ["false", "Without an agent"], ["true", "With an agent"]] },
  deal_opened: { key: "side", label: "Side", options: [["", "Either side"], ["buyer", "Buyer side"], ["seller", "Seller side"]] },
  deal_closed: { key: "side", label: "Side", options: [["", "Either side"], ["buyer", "Buyer side"], ["seller", "Seller side"]] },
};

let nextId = 1;
const blank = (): DraftStep => ({ id: nextId++, amount: 0, unit: "hours", kind: "task", task_kind: "call", title: "", note: "", tag: "" });

/** Build a custom playbook: what starts it, an optional condition, timed steps, and stages that stop it. */
export function WorkflowBuilder() {
  const [trigger, setTrigger] = useState<Trigger>("lead_created");
  const [steps, setSteps] = useState<DraftStep[]>(() => [blank()]);
  const cond = CONDITIONS[trigger];
  const set = (id: number, patch: Partial<DraftStep>) => setSteps((all) => all.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const json = JSON.stringify(steps.map((s) => {
    const after_hours = s.unit === "days" ? s.amount * 24 : s.amount;
    return s.kind === "tag" ? { after_hours, kind: "tag", tag: s.tag } : { after_hours, kind: "task", task_kind: s.task_kind, title: s.title, note: s.note };
  }));
  return (
    <ActionForm action={saveWorkflow} className="flex flex-col gap-4">
      {(pending) => (
        <>
          <input type="hidden" name="steps" value={json} />
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Name</span><input name="name" required maxLength={120} placeholder="e.g. Zillow leads: first 3 days" className={input} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Starts when</span>
              <select name="trigger" value={trigger} onChange={(e) => setTrigger(e.target.value as Trigger)} className={input}>
                {Object.entries(TRIGGERS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            {cond && (
              <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">{cond.label}</span>
                <input type="hidden" name="condition_key" value={cond.key} />
                <select key={trigger} name="condition_value" defaultValue={cond.options[0][0]} className={input}>
                  {cond.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
            )}
          </div>

          <ol className="flex flex-col gap-3">
            {steps.map((s, i) => (
              <li key={s.id} className="flex flex-col gap-2 rounded-2xl bg-surface-1 p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">Step {i + 1}</span>
                  <input type="number" min={0} step={1} aria-label="Delay" value={s.amount} onChange={(e) => set(s.id, { amount: Math.max(0, Number(e.target.value) || 0) })} className={`${inputAuto} w-20`} />
                  <select aria-label="Delay unit" value={s.unit} onChange={(e) => set(s.id, { unit: e.target.value as DraftStep["unit"] })} className={inputAuto}><option value="hours">hours</option><option value="days">days</option></select>
                  <span className="text-muted">after it starts,</span>
                  <select aria-label="Step type" value={s.kind} onChange={(e) => set(s.id, { kind: e.target.value as DraftStep["kind"] })} className={inputAuto}><option value="task">create a task</option><option value="tag">add a tag</option></select>
                  {steps.length > 1 && <button type="button" aria-label={`Remove step ${i + 1}`} onClick={() => setSteps((all) => all.filter((x) => x.id !== s.id))} className="ml-auto grid size-10 place-items-center rounded-full text-muted hover:bg-surface-3"><X aria-hidden className="size-4" /></button>}
                </div>
                {s.kind === "task" ? (
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input aria-label="Task title" required value={s.title} onChange={(e) => set(s.id, { title: e.target.value })} maxLength={300} placeholder="Call {first_name}" className={input} />
                    <select aria-label="Task kind" value={s.task_kind} onChange={(e) => set(s.id, { task_kind: e.target.value })} className={inputAuto}>
                      {[["call", "Call"], ["email", "Email"], ["video", "Video call"], ["showing", "Showing"], ["cma", "CMA"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <input aria-label="Task note" value={s.note} onChange={(e) => set(s.id, { note: e.target.value })} maxLength={2000} placeholder="Note for whoever does it (optional)" className={`${input} sm:col-span-2`} />
                  </div>
                ) : (
                  <input aria-label="Tag" required value={s.tag} onChange={(e) => set(s.id, { tag: e.target.value })} maxLength={30} placeholder="e.g. nurture" className={input} />
                )}
              </li>
            ))}
          </ol>
          {steps.length < 20 && <button type="button" onClick={() => setSteps((all) => [...all, blank()])} className={`${pill} self-start`}><Plus aria-hidden className="size-4" /> Add a step</button>}
          <p className="text-xs text-muted">Use {"{first_name}"} in titles and notes. Tasks go to the lead&apos;s owner.</p>

          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-1.5 text-muted">Stop when the lead reaches</legend>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((st) => (
                <label key={st} className="flex min-h-10 cursor-pointer items-center rounded-full bg-surface-3 px-3.5 has-[:checked]:bg-accent has-[:checked]:font-medium has-[:checked]:text-on-light has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
                  <input type="checkbox" name="stop" value={st} defaultChecked={st === "Lost"} className="sr-only" />{st}
                </label>
              ))}
            </div>
          </fieldset>
          <button disabled={pending} className={`${primaryBtn} self-start`}>{pending ? "Saving…" : "Save and turn on"}</button>
        </>
      )}
    </ActionForm>
  );
}
