"use client";

import { useState } from "react";
import { createDeal, updateDeal } from "@/lib/actions";
import { cash } from "@/lib/data";
import { commission } from "@/lib/deals";
import type { Deal } from "@/lib/db";
import { ActionForm, input, primaryBtn } from "./forms";

type Option = { id: string; name: string };

function Labeled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** New deal (pick client and home) or edit terms. Shows the commission split live as numbers change. */
export type DealPrefill = { offerId: string; side: "buyer" | "seller"; propertyId: string | null; address: string; price: number; closeOn: string | null };

export function DealForm({ deal, clients, listings, contactId, prefill }: { deal?: Deal; clients?: Option[]; listings?: { id: string; address: string }[]; contactId?: string; prefill?: DealPrefill }) {
  const [price, setPrice] = useState(deal ? String(deal.price) : prefill ? String(prefill.price) : "");
  const [rate, setRate] = useState(String(deal?.commissionPct ?? 3));
  const [split, setSplit] = useState(String(deal?.agentSplitPct ?? 70));
  const [referral, setReferral] = useState(String(deal?.referralPct ?? 0));
  const [listing, setListing] = useState(deal?.property?.id ?? prefill?.propertyId ?? "");
  const c = commission(Number(price) || 0, Number(rate) || 0, Number(split) || 0, Number(referral) || 0);

  return (
    <ActionForm action={deal ? updateDeal : createDeal}>
      {(pending) => (
        <>
          {deal && <input type="hidden" name="id" value={deal.id} />}
          {prefill && <input type="hidden" name="offer_id" value={prefill.offerId} />}
          {!deal && (
            <>
              <Labeled label="Client">
                <select name="contact_id" required defaultValue={contactId ?? ""} className={input}>
                  <option value="" disabled>Choose a lead…</option>
                  {clients?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </Labeled>
              <fieldset className="flex flex-col gap-2 text-sm">
                <legend className="mb-1.5 text-muted">You represent the</legend>
                <div className="grid grid-cols-2 gap-2">
                  {[["buyer", "Buyer"], ["seller", "Seller"]].map(([v, l], i) => (
                    <label key={v} className="flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-surface-1 px-4 has-[:checked]:bg-accent has-[:checked]:font-medium has-[:checked]:text-on-light has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
                      <input type="radio" name="side" value={v} defaultChecked={prefill ? prefill.side === v : i === 0} className="sr-only" />{l}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Labeled label="Home">
                <select name="property_id" value={listing} onChange={(e) => setListing(e.target.value)} className={input}>
                  <option value="">Not one of our listings</option>
                  {listings?.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
                </select>
              </Labeled>
            </>
          )}
          {!listing && (
            <Labeled label="Property address">
              <input name="address" required defaultValue={deal?.address ?? prefill?.address} maxLength={300} autoComplete="off" placeholder="123 Main St, City, ST" className={input} />
            </Labeled>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <Labeled label="Contract price">
              <input name="price" type="number" inputMode="numeric" required min={1} step={1} value={price} onChange={(e) => setPrice(e.target.value)} className={input} />
            </Labeled>
            <Labeled label="Offer accepted">
              <input name="accepted_on" type="date" required suppressHydrationWarning defaultValue={deal?.acceptedOn ?? new Date().toLocaleDateString("en-CA")} className={input} />
            </Labeled>
            <Labeled label="Closing date">
              <input name="close_on" type="date" defaultValue={deal?.closeOn ?? prefill?.closeOn ?? ""} className={input} />
            </Labeled>
          </div>
          {!deal && <p className="-mt-2 text-xs text-muted">We&apos;ll draft the usual milestones from these dates. Check them against the contract; every date is editable.</p>}

          <fieldset className="flex flex-col gap-4 rounded-card bg-surface-1 p-4">
            <legend className="sr-only">Commission</legend>
            <div className="grid grid-cols-3 gap-3">
              <Labeled label="Commission %"><input name="commission_pct" type="number" min={0} max={100} step={0.001} value={rate} onChange={(e) => setRate(e.target.value)} className={input} /></Labeled>
              <Labeled label="Your split %"><input name="agent_split_pct" type="number" min={0} max={100} step={0.001} value={split} onChange={(e) => setSplit(e.target.value)} className={input} /></Labeled>
              <Labeled label="Referral %"><input name="referral_pct" type="number" min={0} max={100} step={0.001} value={referral} onChange={(e) => setReferral(e.target.value)} className={input} /></Labeled>
            </div>
            <dl aria-live="polite" className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              <div><dt className="text-muted">Gross</dt><dd>{cash(c.gci)}</dd></div>
              <div><dt className="text-muted">Referral</dt><dd>{cash(c.referral)}</dd></div>
              <div><dt className="text-muted">Brokerage</dt><dd>{cash(c.brokerage)}</dd></div>
              <div><dt className="text-muted">You</dt><dd className="font-medium text-accent">{cash(c.agent)}</dd></div>
            </dl>
          </fieldset>

          <Labeled label="Notes">
            <textarea name="notes" rows={3} maxLength={5000} defaultValue={deal?.notes} placeholder="Lender, title company, anything the team should know" className={`${input} resize-y`} />
          </Labeled>
          <button disabled={pending} className={`${primaryBtn} self-start`}>{pending ? "Saving…" : deal ? "Save terms" : "Open deal"}</button>
        </>
      )}
    </ActionForm>
  );
}
