"use client";

import { CalendarPlus, Check, Copy } from "lucide-react";
import { useState, useTransition } from "react";
import { saveShowingFeedback, scheduleShowing, setShowingStatus } from "@/lib/actions";
import type { Showing } from "@/lib/db";
import { ActionForm, input, inputAuto, primaryBtn } from "./forms";
import { LocalTime } from "./local-time";

const pill = "flex min-h-10 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60";

/** Book a showing. With `contactId` the buyer is fixed (lead page); otherwise pick one. */
export function ScheduleShowing({ contactId, buyers, listings, propertyId }: { contactId?: string; buyers?: { id: string; name: string }[]; listings: { id: string; address: string }[]; propertyId?: string }) {
  const [local, setLocal] = useState("");
  const [listing, setListing] = useState(propertyId ?? "");
  return (
    <ActionForm action={scheduleShowing} className="grid gap-3 sm:grid-cols-2">
      {(pending) => (
        <>
          <input type="hidden" name="starts_at" value={local ? new Date(local).toISOString() : ""} />
          {contactId ? <input type="hidden" name="contact_id" value={contactId} /> : (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted">Buyer</span>
              <select name="contact_id" required defaultValue="" className={input}>
                <option value="" disabled>Choose a lead…</option>
                {buyers?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          )}
          {propertyId ? <input type="hidden" name="property_id" value={propertyId} /> : (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted">Home</span>
              <select name="property_id" value={listing} onChange={(e) => setListing(e.target.value)} className={input}>
                <option value="">Not one of our listings</option>
                {listings.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
              </select>
            </label>
          )}
          {!listing && (
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="text-muted">Address</span>
              <input name="address" required maxLength={300} autoComplete="off" placeholder="123 Main St, City, ST" className={input} />
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">When</span>
            <input type="datetime-local" required value={local} onChange={(e) => setLocal(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Length</span>
            <select name="minutes" defaultValue="30" className={input}>{[15, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="text-muted">Notes <span className="text-xs">(optional)</span></span>
            <input name="notes" maxLength={2000} placeholder="e.g. Meet at the curb, bring pre-approval letter" className={input} />
          </label>
          <button disabled={pending} className={`${primaryBtn} w-fit`}>{pending ? "Booking…" : "Book showing"}</button>
        </>
      )}
    </ActionForm>
  );
}

/** Status buttons, the buyer confirmation message and the calendar file. */
export function ShowingActions({ s }: { s: Showing }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const go = (st: Showing["status"]) => start(() => setShowingStatus(s.id, st));
  const copy = () => {
    const when = new Date(s.startsAt).toLocaleString(undefined, { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    navigator.clipboard.writeText(`Hi ${s.contact.name.split(" ")[0]}, confirming our showing at ${s.address} on ${when}. See you there! Reply if anything changes.`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  const upcoming = s.status === "requested" || s.status === "confirmed";
  return (
    <div className="flex flex-wrap gap-2">
      {s.status === "requested" && <button type="button" disabled={pending} onClick={() => go("confirmed")} className={pill}>Mark confirmed</button>}
      {upcoming && <button type="button" onClick={copy} className={pill}>{copied ? <Check aria-hidden className="size-4 text-accent" /> : <Copy aria-hidden className="size-4" />}{copied ? "Copied" : "Copy confirmation"}</button>}
      {upcoming && <a href={`/api/showings/${s.id}/ics`} className={pill}><CalendarPlus aria-hidden className="size-4" /> Add to calendar</a>}
      {upcoming && <button type="button" disabled={pending} onClick={() => go("no_show")} className={pill}>No-show</button>}
      {upcoming && <button type="button" disabled={pending} onClick={() => go("cancelled")} className={`${pill} text-score-1`}>Cancel</button>}
      {!upcoming && s.status !== "done" && <button type="button" disabled={pending} onClick={() => go("requested")} className={pill}>Restore</button>}
    </div>
  );
}

const INTEREST = [["not_interested", "Not for them"], ["maybe", "Maybe"], ["interested", "Interested"], ["offer", "Wants to offer"]] as const;

export function ShowingFeedback({ s }: { s: Showing }) {
  return (
    <ActionForm action={saveShowingFeedback} className="flex flex-col gap-3">
      {(pending) => (
        <>
          <input type="hidden" name="id" value={s.id} />
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-1.5 text-muted">How did {s.contact.name.split(" ")[0]} feel about it?</legend>
            <div className="flex flex-wrap gap-2">
              {INTEREST.map(([v, l]) => (
                <label key={v} className="flex min-h-10 cursor-pointer items-center rounded-full bg-surface-3 px-3.5 has-[:checked]:bg-accent has-[:checked]:font-medium has-[:checked]:text-on-light has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
                  <input type="radio" name="interest" value={v} required defaultChecked={s.interest === v} className="sr-only" />{l}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-start gap-2">
            <input name="feedback" defaultValue={s.feedback} maxLength={2000} placeholder="What they said (shared with the seller report)" aria-label="Feedback" className={`${inputAuto} min-w-56 flex-1`} />
            <select name="rating" defaultValue={s.rating ?? ""} aria-label="Rating out of 5" className={inputAuto}>
              <option value="">Rating</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}/5</option>)}
            </select>
            <button disabled={pending} className={primaryBtn}>{pending ? "…" : "Save"}</button>
          </div>
        </>
      )}
    </ActionForm>
  );
}

const STATUS = { requested: "Requested", confirmed: "Confirmed", done: "Done", cancelled: "Cancelled", no_show: "No-show" } as const;

/** One showing in a list: when, where, who, status, then the right actions for its state. */
export function ShowingItem({ s, conflict, showBuyer = true }: { s: Showing; conflict?: boolean; showBuyer?: boolean }) {
  const past = new Date(s.endsAt) < new Date();
  const needsFeedback = (s.status === "done" || (past && s.status === "confirmed")) && !s.interest;
  return (
    <li className="flex flex-col gap-3 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="font-medium"><LocalTime ts={s.startsAt} opts={{ weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }} /> · {s.address}</p>
          {showBuyer && <p className="text-sm text-muted">with <a href={`/leads/${s.contact.id}`} className="text-ink hover:text-accent">{s.contact.name}</a>{s.contact.phone && <> · <a href={`tel:${s.contact.phone}`} className="hover:text-accent">{s.contact.phone}</a></>}</p>}
          {s.showingNotes && (s.status === "requested" || s.status === "confirmed") && <p className="text-sm text-ink/80">Instructions: {s.showingNotes}</p>}
          {s.notes && <p className="text-sm text-muted">{s.notes}</p>}
          {conflict && <p className="text-sm text-score-1">Overlaps another showing for the same agent</p>}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${s.status === "confirmed" ? "bg-accent text-on-light" : s.status === "cancelled" || s.status === "no_show" ? "bg-surface-3 text-muted" : "bg-surface-3"}`}>{STATUS[s.status]}</span>
      </div>
      {needsFeedback || (s.status === "done" && s.interest) ? <ShowingFeedback s={s} /> : <ShowingActions s={s} />}
    </li>
  );
}
