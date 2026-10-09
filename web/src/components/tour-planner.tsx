"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useState } from "react";
import { scheduleTour } from "@/lib/actions";
import { planTour } from "@/lib/showings";
import { ActionForm, inputAuto, primaryBtn } from "./forms";

/** Pick homes, put them in driving order, and book them back to back. */
export function TourPlanner({ contactId, listings }: { contactId: string; listings: { id: string; address: string }[] }) {
  const [stops, setStops] = useState<string[]>([]);
  const [local, setLocal] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [travel, setTravel] = useState(15);
  const iso = local ? new Date(local).toISOString() : "";
  const plan = iso ? planTour(iso, stops.length, minutes, travel) : [];
  const name = (id: string) => listings.find((l) => l.id === id)?.address ?? "";
  const move = (i: number, d: -1 | 1) => setStops((s) => { const n = [...s]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; });
  const time = (t: string) => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return (
    <ActionForm action={scheduleTour} className="flex flex-col gap-3">
      {(pending) => (
        <>
          <input type="hidden" name="contact_id" value={contactId} />
          <input type="hidden" name="starts_at" value={iso} />
          {stops.map((id) => <input key={id} type="hidden" name="property_id" value={id} />)}
          <select value="" onChange={(e) => e.target.value && setStops([...stops, e.target.value])} aria-label="Add a home to the tour" className={inputAuto}>
            <option value="">Add a home…</option>
            {listings.filter((l) => !stops.includes(l.id)).map((l) => <option key={l.id} value={l.id}>{l.address}</option>)}
          </select>
          {stops.length > 0 && (
            <ol className="flex flex-col gap-1 text-sm">
              {stops.map((id, i) => (
                <li key={id} className="flex min-h-11 items-center gap-2 rounded-2xl bg-surface-1 px-3">
                  <span className="w-6 text-muted">{i + 1}.</span>
                  <span className="min-w-0 flex-1 truncate">{name(id)}</span>
                  {plan[i] && <span className="text-xs text-muted">{time(plan[i].startsAt)}</span>}
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${name(id)} earlier`} className="grid size-9 place-items-center rounded-full hover:bg-surface-3 disabled:opacity-30"><ArrowUp aria-hidden className="size-4" /></button>
                  <button type="button" disabled={i === stops.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${name(id)} later`} className="grid size-9 place-items-center rounded-full hover:bg-surface-3 disabled:opacity-30"><ArrowDown aria-hidden className="size-4" /></button>
                  <button type="button" onClick={() => setStops(stops.filter((x) => x !== id))} aria-label={`Remove ${name(id)}`} className="grid size-9 place-items-center rounded-full hover:bg-surface-3"><X aria-hidden className="size-4" /></button>
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap items-end gap-2 text-sm">
            <label className="flex flex-col gap-1"><span className="text-muted">Start</span><input type="datetime-local" required value={local} onChange={(e) => setLocal(e.target.value)} className={inputAuto} /></label>
            <label className="flex flex-col gap-1"><span className="text-muted">Minutes per home</span><input name="minutes" type="number" min={10} max={120} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={`${inputAuto} w-24`} /></label>
            <label className="flex flex-col gap-1"><span className="text-muted">Travel between</span><input name="travel" type="number" min={0} max={120} value={travel} onChange={(e) => setTravel(Number(e.target.value))} className={`${inputAuto} w-24`} /></label>
            <button disabled={pending || stops.length < 2} className={primaryBtn}>{pending ? "Booking…" : `Book ${stops.length || ""} showings`}</button>
          </div>
          {plan.length > 0 && <p className="text-xs text-muted">Ends about {time(plan[plan.length - 1].endsAt)}. Put stops in driving order; each is booked as its own showing.</p>}
        </>
      )}
    </ActionForm>
  );
}
