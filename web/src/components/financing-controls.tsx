"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deletePartner, saveFinancing, savePartner } from "@/lib/actions";
import type { FinancingRecord } from "@/lib/db";
import { DOCS, LOAN_STAGES, PARTNER_KINDS } from "@/lib/readiness";
import { ActionForm, input, primaryBtn } from "./forms";


export function PartnerForm() {
  return (
    <ActionForm action={savePartner} className="grid gap-3 sm:grid-cols-2">
      {(pending) => (
        <>
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">What they do</span>
            <select name="kind" required defaultValue="lender" className={input}>{Object.entries(PARTNER_KINDS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Name</span><input name="name" required maxLength={200} className={input} /></label>
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Company</span><input name="company" maxLength={200} className={input} /></label>
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Phone</span><input name="phone" type="tel" maxLength={30} className={input} /></label>
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Email</span><input name="email" type="email" maxLength={320} className={input} /></label>
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Notes</span><input name="notes" maxLength={2000} placeholder="e.g. Fast closes, great with FHA" className={input} /></label>
          <button disabled={pending} className={`${primaryBtn} w-fit`}>{pending ? "Adding…" : "Add partner"}</button>
        </>
      )}
    </ActionForm>
  );
}

export function DeletePartner({ id, name }: { id: string; name: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onBlur={() => setArmed(false)} aria-label={armed ? `Press again to remove ${name}` : `Remove ${name}`}
      onClick={() => (armed ? start(() => deletePartner(id)) : setArmed(true))}
      className={`flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm ${armed ? "bg-score-1 font-medium text-on-light" : "text-muted hover:bg-surface-3 hover:text-score-1"}`}>
      <Trash2 aria-hidden className="size-4" />{armed && "Remove?"}
    </button>
  );
}

/** What we know about a buyer's financing. Recorded facts only. */
export function FinancingForm({ contactId, f, lenders }: { contactId: string; f: FinancingRecord | null; lenders: { id: string; label: string }[] }) {
  const [cash, setCash] = useState(f?.cash ?? false);
  const [gift, setGift] = useState(f?.giftFunds ?? false);
  return (
    <ActionForm action={saveFinancing} className="flex flex-col gap-3">
      {(pending) => (
        <>
          <input type="hidden" name="contact_id" value={contactId} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="cash" checked={cash} onChange={(e) => setCash(e.target.checked)} className="size-5 accent-[var(--color-accent)]" />
            Paying cash
          </label>
          {!cash && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Lender</span>
                <select name="lender_id" defaultValue={f?.lenderId ?? ""} className={input}>
                  <option value="">Not chosen yet</option>
                  {lenders.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
                {lenders.length === 0 && <span className="text-xs text-muted">Add lenders on the Partners page.</span>}
              </label>
              <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Loan stage</span>
                <select name="stage" defaultValue={f?.stage ?? "not_started"} className={input}>{Object.entries(LOAN_STAGES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Preapproved up to</span>
                <input name="preapproval_amount" type="number" inputMode="numeric" min={1} step={1000} defaultValue={f?.preapprovalAmount ?? ""} className={input} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Preapproval expires</span>
                <input name="preapproval_expires" type="date" defaultValue={f?.preapprovalExpires ?? ""} className={input} />
              </label>
            </div>
          )}
          {cash && <input type="hidden" name="stage" value="not_started" />}
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-1.5 text-muted">{cash ? "Proof of funds" : "Documents received"}</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(DOCS) as [keyof typeof DOCS, string][]).filter(([d]) => (cash ? d === "bank_statements" : d !== "gift_letter" || gift)).map(([d, l]) => (
                <label key={d} className="flex min-h-10 cursor-pointer items-center rounded-full bg-surface-3 px-3.5 has-[:checked]:bg-accent has-[:checked]:font-medium has-[:checked]:text-on-light has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
                  <input type="checkbox" name="docs" value={d} defaultChecked={f?.docs.includes(d)} className="sr-only" />{cash ? "Bank statements / proof of funds" : l}
                </label>
              ))}
            </div>
          </fieldset>
          {!cash && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="gift_funds" checked={gift} onChange={(e) => setGift(e.target.checked)} className="size-5 accent-[var(--color-accent)]" />
              Part of the down payment is a gift
            </label>
          )}
          <button disabled={pending} className={`${primaryBtn} self-start`}>{pending ? "Saving…" : "Save financing"}</button>
        </>
      )}
    </ActionForm>
  );
}
