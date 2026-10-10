"use client";

import { Check, Copy, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteOpenHouse, scheduleOpenHouse } from "@/lib/actions";
import { ActionForm, inputAuto, primaryBtn } from "./forms";

/** Start and end are picked in the agent's local time and sent as ISO. */
export function ScheduleOpenHouse({ propertyId }: { propertyId: string }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const iso = (v: string) => (v ? new Date(v).toISOString() : "");
  return (
    <ActionForm action={scheduleOpenHouse} className="flex flex-wrap items-end gap-2">
      {(pending) => (
        <>
          <input type="hidden" name="property_id" value={propertyId} />
          <input type="hidden" name="starts_at" value={iso(start)} />
          <input type="hidden" name="ends_at" value={iso(end)} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Starts</span>
            <input type="datetime-local" required value={start} className={inputAuto}
              onChange={(e) => { setStart(e.target.value); if (!end && e.target.value) setEnd(plusHours(e.target.value, 2)); }} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Ends</span>
            <input type="datetime-local" required value={end} min={start} onChange={(e) => setEnd(e.target.value)} className={inputAuto} />
          </label>
          <button disabled={pending} className={primaryBtn}>{pending ? "Scheduling…" : "Schedule"}</button>
        </>
      )}
    </ActionForm>
  );
}

// "2026-10-11T13:00" + 2h, still as a local datetime-local value.
function plusHours(local: string, h: number) {
  const d = new Date(new Date(local).getTime() + h * 3600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CopyLink({ url, label = "Copy sign-in link" }: { url: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="flex min-h-11 items-center gap-2 rounded-full bg-surface-3 px-4 text-sm hover:bg-surface-1"
      onClick={() => navigator.clipboard.writeText(url).then(() => { setDone(true); setTimeout(() => setDone(false), 2000); })}>
      {done ? <Check aria-hidden className="size-4 text-accent" /> : <Copy aria-hidden className="size-4" />}
      {done ? "Copied" : label}
    </button>
  );
}

export function DeleteOpenHouse({ id, propertyId, visits }: { id: string; propertyId: string; visits: number }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onBlur={() => setArmed(false)}
      onClick={() => (armed ? start(() => deleteOpenHouse(id, propertyId)) : setArmed(true))}
      className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-sm transition duration-200 ${armed ? "bg-score-1 font-medium text-on-light" : "text-score-1 hover:bg-surface-3"}`}>
      <Trash2 aria-hidden className="size-4" />
      {pending ? "Removing…" : armed ? (visits ? `Press again: removes ${visits} sign-in${visits === 1 ? "" : "s"} (leads stay)` : "Press again to remove") : "Remove"}
    </button>
  );
}
