"use client";

import { X } from "lucide-react";
import { useTransition } from "react";
import { addSuppression, removeSuppression } from "@/lib/actions";
import { ActionForm, inputAuto, primaryBtn } from "./forms";

/** Team do-not-contact list. Removing an entry doesn't clear DNC on leads; that stays a person's decision. */
export function Suppressions({ items }: { items: { kind: "email" | "phone"; value: string; reason: string }[] }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface-2 p-5">
      <p className="text-sm text-muted">People who asked not to be contacted. Any lead with one of these, now or later (forms, imports), is marked do-not-contact automatically.</p>
      <ActionForm action={addSuppression} className="flex flex-wrap items-start gap-2">
        {(p) => (
          <>
            <input name="value" required maxLength={320} placeholder="Email or phone" aria-label="Email or phone" className={`${inputAuto} min-w-48 flex-1`} />
            <input name="reason" maxLength={200} placeholder="Reason (optional)" aria-label="Reason" className={`${inputAuto} min-w-40 flex-1`} />
            <button disabled={p} className={primaryBtn}>{p ? "…" : "Add"}</button>
          </>
        )}
      </ActionForm>
      {items.length > 0 && (
        <ul className="flex max-h-72 flex-col divide-y divide-white/5 overflow-y-auto text-sm">
          {items.map((s) => (
            <li key={`${s.kind}:${s.value}`} className="flex min-h-11 items-center gap-2">
              <span className="min-w-0 flex-1 truncate">{s.value}{s.reason && <span className="text-muted"> · {s.reason}</span>}</span>
              <button type="button" disabled={pending} aria-label={`Remove ${s.value}`} onClick={() => start(() => removeSuppression(s.kind, s.value))}
                className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface-3 hover:text-ink"><X aria-hidden className="size-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
