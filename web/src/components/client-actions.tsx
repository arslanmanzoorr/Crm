"use client";

import { Check, Copy } from "lucide-react";
import { useState, useTransition } from "react";
import { addTestimonial, logCheckin, markReviewAsked, saveReviewUrl, setReferredBy } from "@/lib/actions";
import { ActionForm, input, inputAuto, primaryBtn } from "./forms";

const pill = "flex min-h-10 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60";

/** Copies a ready-to-send review request, then records that we asked. */
export function ReviewRequest({ dealId, firstName, side, address, reviewUrl }: { dealId: string; firstName: string; side: "buyer" | "seller"; address: string; reviewUrl: string | null }) {
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const text = `Hi ${firstName}, it was a real pleasure helping you ${side === "buyer" ? "buy" : "sell"} ${address}. If you have a minute, a short review would mean a lot to me${reviewUrl ? `: ${reviewUrl}` : "."} Thank you!`;
  return (
    <span className="flex flex-wrap gap-2">
      <button type="button" className={pill} onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>
        {copied ? <Check aria-hidden className="size-4 text-accent" /> : <Copy aria-hidden className="size-4" />} {copied ? "Copied" : "Copy request"}
      </button>
      <button type="button" disabled={pending} className={pill} onClick={() => start(() => markReviewAsked(dealId))}>{pending ? "…" : "Mark asked"}</button>
    </span>
  );
}

export function CheckinButton({ contactId, what }: { contactId: string; what: string }) {
  const [pending, start] = useTransition();
  return <button type="button" disabled={pending} className={pill} onClick={() => start(() => logCheckin(contactId, what))}>{pending ? "Logging…" : "Log check-in"}</button>;
}

export function TestimonialForm({ clients }: { clients: { contactId: string; dealId: string; name: string }[] }) {
  const [deal, setDeal] = useState("");
  return (
    <ActionForm action={addTestimonial} className="flex flex-col gap-3">
      {(pending) => (
        <>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Client</span>
            <select name="contact_id" required className={input} defaultValue="" onChange={(e) => setDeal(clients.find((c) => c.contactId === e.target.value)?.dealId ?? "")}>
              <option value="" disabled>Choose a past client…</option>
              {clients.map((c) => <option key={c.contactId} value={c.contactId}>{c.name}</option>)}
            </select>
          </label>
          <input type="hidden" name="deal_id" value={deal} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">What they said</span>
            <textarea name="body" required rows={3} maxLength={2000} className={`${input} resize-y`} />
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">Stars</span>
              <select name="rating" defaultValue="" className={inputAuto}><option value="">–</option>{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="publish_ok" className="size-5 accent-[var(--color-accent)]" />
              They agreed we can publish it
            </label>
          </div>
          <button disabled={pending} className={`${primaryBtn} self-start`}>{pending ? "Saving…" : "Save testimonial"}</button>
        </>
      )}
    </ActionForm>
  );
}

export function ReferredBySelect({ contactId, current, options }: { contactId: string; current: string; options: { id: string; name: string }[] }) {
  const [pending, start] = useTransition();
  return (
    <select aria-label="Referred by" disabled={pending} defaultValue={current} onChange={(e) => { const v = e.target.value; start(() => setReferredBy(contactId, v)); }} className={`${inputAuto} max-w-full`}>
      <option value="">Nobody</option>
      {options.filter((o) => o.id !== contactId).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}

export function ReviewUrlForm({ current }: { current: string | null }) {
  return (
    <ActionForm action={saveReviewUrl} className="flex flex-wrap items-start gap-2">
      {(pending) => (
        <>
          <input name="review_url" type="url" defaultValue={current ?? ""} placeholder="https://g.page/r/your-business/review" aria-label="Review link" className={`${inputAuto} min-w-64 flex-1`} />
          <button disabled={pending} className={primaryBtn}>{pending ? "…" : "Save"}</button>
        </>
      )}
    </ActionForm>
  );
}
