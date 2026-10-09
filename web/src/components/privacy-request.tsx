"use client";

import { CircleCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { submitPrivacyRequest, updatePrivacyRequest } from "@/lib/actions";
import type { PrivacyRequest } from "@/lib/db";
import { ActionForm, Field, input, inputAuto, primaryBtn } from "./forms";

const KINDS = [
  ["access", "Tell me what information you have about me"],
  ["delete", "Delete my information"],
  ["correct", "Correct my information"],
  ["opt_out", "Don't sell or share my information"],
] as const;

/** Public request form. Verification happens by the business before anything is released or deleted. */
export function PrivacyRequestForm({ formId, who }: { formId: string; who: string }) {
  const [startedAt] = useState(() => Date.now());
  const [sent, setSent] = useState(false);
  if (sent)
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-card bg-surface-2 p-10 text-center">
        <CircleCheck aria-hidden className="size-10 text-accent" />
        <h1 className="text-2xl">Request received</h1>
        <p className="text-muted">{who} will confirm it&apos;s you, then respond within 45 days.</p>
      </div>
    );
  const action = async (s: Parameters<typeof submitPrivacyRequest>[1], f: FormData) => {
    const r = await submitPrivacyRequest(formId, s, f);
    if (r?.ok) setSent(true);
    return r;
  };
  return (
    <div className="flex flex-col gap-6 rounded-card bg-surface-2 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-light">Your privacy choices</h1>
        <p className="mt-1 text-muted">Ask {who} to show, delete or correct the information they have about you, or to stop selling or sharing it.</p>
      </div>
      <ActionForm action={action}>
        {(pending) => (
          <>
            <input type="hidden" name="t" value={startedAt} />
            <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden"><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <fieldset className="flex flex-col gap-2 text-sm">
              <legend className="mb-1.5 text-muted">What would you like?</legend>
              {KINDS.map(([v, l]) => (
                <label key={v} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl bg-surface-1 px-4 has-[:checked]:ring-2 has-[:checked]:ring-accent">
                  <input type="radio" name="kind" value={v} required className="size-4 accent-[var(--color-accent)]" />{l}
                </label>
              ))}
            </fieldset>
            <Field label="Your name" name="name" required autoComplete="name" maxLength={200} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email we have on file" name="email" type="email" autoComplete="email" maxLength={320} />
              <Field label="Phone we have on file" name="phone" type="tel" autoComplete="tel" maxLength={30} />
            </div>
            <Field label="State (2 letters, optional)" name="state" maxLength={2} autoComplete="address-level1" placeholder="CA" />
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted">Anything we should know <span className="text-xs">(optional)</span></span>
              <textarea name="details" rows={3} maxLength={2000} placeholder="For corrections, tell us what's wrong" className={`${input} resize-y`} />
            </label>
            <p className="text-xs text-muted">We use these details only to find your records and confirm the request is yours. We may contact you to verify before acting.</p>
            <button disabled={pending} className={`${primaryBtn} w-full`}>{pending ? "Sending…" : "Send request"}</button>
          </>
        )}
      </ActionForm>
    </div>
  );
}

const LABEL = { access: "See my data", delete: "Delete", correct: "Correct", opt_out: "Opt out of sale/sharing" } as const;

/** Tracker for owners/admins: due date, verification, resolution notes. */
export function PrivacyRequests({ items }: { items: PrivacyRequest[] }) {
  if (items.length === 0) return <p className="rounded-card bg-surface-2 p-5 text-sm text-muted">No requests. The public page is linked from your lead form.</p>;
  return (
    <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
      {items.map((r) => <Row key={r.id} r={r} />)}
    </ul>
  );
}

function Row({ r }: { r: PrivacyRequest }) {
  const [status, setStatus] = useState(r.status);
  const [note, setNote] = useState(r.resolution);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const left = Math.round((Date.parse(`${r.dueOn}T00:00:00Z`) - Date.parse(new Date().toISOString().slice(0, 10))) / 86_400_000);
  const open = status === "open" || status === "verifying";
  return (
    <li className="flex flex-col gap-2 px-5 py-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{LABEL[r.kind]}: {r.name}</span>
        <span className={open && left <= 7 ? "text-score-1" : "text-muted"}>{open ? (left < 0 ? `${-left} days overdue` : `due in ${left} days`) : status}</span>
      </div>
      <p className="text-muted">{[r.email, r.phone, r.state].filter(Boolean).join(" · ")}</p>
      {r.details && <p className="text-ink/80">{r.details}</p>}
      <div className="flex flex-wrap items-start gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value as PrivacyRequest["status"])} aria-label="Status" className={inputAuto}>
          <option value="open">Open</option><option value="verifying">Verifying identity</option><option value="done">Done</option><option value="denied">Denied (couldn&apos;t verify)</option>
        </select>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="What you did (kept as a record)" aria-label="Resolution" className={`${inputAuto} min-w-48 flex-1`} />
        <button type="button" disabled={pending} onClick={() => start(async () => { const x = await updatePrivacyRequest(r.id, status, note); setMsg(x?.ok ?? x?.error ?? null); })} className={primaryBtn}>{pending ? "…" : "Save"}</button>
      </div>
      {msg && <p aria-live="polite" className="text-accent">{msg}</p>}
      {r.kind === "delete" && open && <p className="text-xs text-muted">After verifying, delete the lead from their page: their activity, tasks, deals, documents and audit history are erased with it.</p>}
    </li>
  );
}
