"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { setPlan } from "@/lib/actions";
import { PLANS, price, YEARLY_MONTHS, type PlanKey } from "@/lib/plans";

/** Early access: owners and admins switch plans freely to see what each includes. Prices show what it will cost. */
export function PlanPicker({ plan, interval, seats, canEdit }: { plan: PlanKey; interval: "month" | "year"; seats: number; canEdit: boolean }) {
  const [p, setP] = useState(plan);
  const [yearly, setYearly] = useState(interval === "year");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const save = (next: PlanKey, y: boolean) => {
    const prev = [p, yearly] as const;
    setP(next); setYearly(y); setMsg(null);
    start(async () => { const r = await setPlan(next, y ? "year" : "month"); if (r?.error) { setP(prev[0]); setYearly(prev[1]); } setMsg(r ?? null); });
  };
  return (
    <div className="flex flex-col gap-4">
      <fieldset disabled={!canEdit || pending} className="flex w-fit gap-1 rounded-full bg-surface-2 p-1">
        <legend className="sr-only">Billing period</legend>
        {([["Monthly", false], [`Yearly · ${12 - YEARLY_MONTHS} months free`, true]] as const).map(([label, v]) => (
          <label key={label} className={`flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent has-[:disabled]:cursor-default ${yearly === v ? "bg-surface-light text-on-light" : "text-muted hover:text-ink"}`}>
            <input type="radio" name="interval" className="sr-only" checked={yearly === v} onChange={() => save(p, v)} />{label}
          </label>
        ))}
      </fieldset>
      <fieldset disabled={!canEdit || pending} className="grid gap-3 md:grid-cols-3">
        <legend className="sr-only">Plan</legend>
        {PLANS.map((x) => {
          const on = p === x.key, each = price(x.monthly, yearly);
          return (
            <label key={x.key} className={`flex cursor-pointer flex-col gap-3 rounded-card p-5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent has-[:disabled]:cursor-default ${on ? "bg-accent text-on-light" : "bg-surface-2 hover:bg-surface-3"}`}>
              <input type="radio" name="plan" className="sr-only" checked={on} onChange={() => save(x.key, yearly)} />
              <span className="flex items-center justify-between"><span className="text-xl font-medium">{x.name}</span>{on && <span className="flex items-center gap-1 text-sm font-medium"><Check aria-hidden className="size-4" /> Your plan</span>}</span>
              <span className="text-sm">
                <span className="text-2xl font-light">${each}</span> per agent / {yearly ? "year" : "month"}
                <span className={`block ${on ? "text-on-light/70" : "text-muted"}`}>${each * seats} / {yearly ? "year" : "month"} for {seats} agent{seats === 1 ? "" : "s"}</span>
              </span>
              <span className={`text-sm ${on ? "text-on-light/80" : "text-muted"}`}>{x.pitch}</span>
            </label>
          );
        })}
      </fieldset>
      <p role="status" className={`text-sm ${msg?.error ? "text-score-1" : "text-muted"}`}>
        {msg?.error ?? msg?.ok ?? (canEdit ? "Moving to a lower plan keeps your settings; the features it doesn't include pause until you move back." : "An owner or admin can change the plan.")}
      </p>
    </div>
  );
}
