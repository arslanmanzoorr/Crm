"use client";

import { X } from "lucide-react";
import { useTransition } from "react";
import { addTerritory, removeTerritory } from "@/lib/actions";
import { ActionForm, inputAuto, primaryBtn } from "./forms";

/** Areas owned by agents: unassigned new leads in an area go to its owner before round-robin. */
export function Territories({ territories, agents, canEdit }: { territories: { area: string; userId: string }[]; agents: { id: string; email: string }[]; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const name = (id: string) => agents.find((a) => a.id === id)?.email ?? "Former member";
  return (
    <section aria-labelledby="territories" className="flex flex-col gap-3">
      <h2 id="territories" className="text-xl">Territories</h2>
      <p className="-mt-2 text-sm text-muted">New leads from your form or imports that name one of these areas go straight to its agent. Others follow lead routing.</p>
      {territories.length > 0 && (
        <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
          {territories.map((t) => (
            <li key={t.area} className="flex min-h-12 items-center gap-3 px-5 text-sm">
              <span className="flex-1 font-medium">{t.area}</span>
              <span className="text-muted">{name(t.userId)}</span>
              {canEdit && (
                <button type="button" disabled={pending} aria-label={`Remove ${t.area}`} onClick={() => start(() => removeTerritory(t.area))}
                  className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface-3 hover:text-ink"><X aria-hidden className="size-4" /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <ActionForm action={addTerritory} className="flex flex-wrap items-start gap-2">
          {(p) => (
            <>
              <input name="area" required maxLength={80} placeholder="Area, e.g. Westside" aria-label="Area" className={`${inputAuto} min-w-40 flex-1`} />
              <select name="user_id" required defaultValue="" aria-label="Agent" className={inputAuto}>
                <option value="" disabled>Agent…</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.email}</option>)}
              </select>
              <button disabled={p} className={primaryBtn}>{p ? "…" : "Assign"}</button>
            </>
          )}
        </ActionForm>
      )}
    </section>
  );
}
