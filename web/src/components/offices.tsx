"use client";

import { X } from "lucide-react";
import { useState, useTransition } from "react";
import { createOffice, deleteOffice, setOffice, setOfficeTimeZone } from "@/lib/actions";
import { US_TIME_ZONES } from "@/lib/showings";
import type { Office } from "@/lib/db";
import { ActionForm, inputAuto, primaryBtn } from "./forms";

/** Offices for multi-office brokerages: create them, place each member, then read analytics and the pipeline per office. */
export function Offices({ offices, members, canEdit }: { offices: Office[]; members: { id: string; email: string; officeId: string | null }[]; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const run = (f: () => Promise<void>) => start(async () => { setErr(""); try { await f(); } catch (e) { setErr((e as Error).message); } });
  if (!canEdit && offices.length === 0) return null;
  return (
    <section aria-labelledby="offices" className="flex flex-col gap-3">
      <h2 id="offices" className="text-xl">Offices</h2>
      <p className="-mt-2 text-sm text-muted">For brokerages with more than one office. Analytics and the team pipeline can then be read per office, and an office in another market can keep its own time zone for due dates.</p>
      {offices.length > 0 && (
        <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
          {offices.map((o) => (
            <li key={o.id} className="flex min-h-12 items-center gap-3 px-5 text-sm">
              <span className="flex-1 font-medium">{o.name}</span>
              {canEdit ? (
                <select aria-label={`Time zone for ${o.name}`} disabled={pending} defaultValue={o.timeZone ?? ""} onChange={(e) => run(() => setOfficeTimeZone(o.id, e.target.value || null))} className={`${inputAuto} min-w-0 max-w-44`}>
                  <option value="">Team time zone</option>
                  {Object.entries(US_TIME_ZONES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              ) : o.timeZone && <span className="text-muted">{US_TIME_ZONES[o.timeZone as keyof typeof US_TIME_ZONES] ?? o.timeZone}</span>}
              <span className="text-muted">{((n) => `${n} member${n === 1 ? "" : "s"}`)(members.filter((m) => m.officeId === o.id).length)}</span>
              {canEdit && (
                <button type="button" disabled={pending} aria-label={`Delete ${o.name}`} onClick={() => run(() => deleteOffice(o.id))}
                  className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface-3 hover:text-ink"><X aria-hidden className="size-4" /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && offices.length > 0 && (
        <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
          {members.map((m) => (
            <li key={m.id} className="flex min-h-12 flex-wrap items-center justify-between gap-2 px-5 py-2 text-sm">
              <span className="min-w-0 break-words">{m.email}</span>
              <select aria-label={`Office for ${m.email}`} disabled={pending} defaultValue={m.officeId ?? ""} onChange={(e) => run(() => setOffice(m.id, e.target.value || null))} className={`${inputAuto} min-w-0 max-w-full`}>
                <option value="">No office</option>
                {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <ActionForm action={createOffice} className="flex flex-wrap items-start gap-2">
          {(p) => (
            <>
              <input name="name" required maxLength={100} placeholder="Office name, e.g. Downtown" aria-label="Office name" className={`${inputAuto} min-w-40 flex-1`} />
              <button disabled={p} className={primaryBtn}>{p ? "…" : "Add office"}</button>
            </>
          )}
        </ActionForm>
      )}
      {err && <p role="alert" className="text-sm text-score-1">{err}</p>}
    </section>
  );
}
