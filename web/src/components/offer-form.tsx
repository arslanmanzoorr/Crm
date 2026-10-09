"use client";

import { useState } from "react";
import { createOffer } from "@/lib/actions";
import { CONTINGENCIES, FINANCING } from "@/lib/offers";
import { ActionForm, input, primaryBtn } from "./forms";

function Labeled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

/**
 * Seller side: an offer received on our listing (who's buying, their terms).
 * Buyer side: the offer our client is making, on one of our listings or any address.
 */
export function OfferForm({ side, propertyId, contactId, listings }: { side: "buyer" | "seller"; propertyId?: string; contactId?: string; listings?: { id: string; address: string }[] }) {
  const [listing, setListing] = useState(propertyId ?? "");
  const [expires, setExpires] = useState("");
  return (
    <ActionForm action={createOffer}>
      {(pending) => (
        <>
          <input type="hidden" name="side" value={side} />
          {contactId && <input type="hidden" name="contact_id" value={contactId} />}
          <input type="hidden" name="expires_at" value={expires ? new Date(expires).toISOString() : ""} />
          {side === "seller" ? (
            <>
              <input type="hidden" name="property_id" value={propertyId} />
              <Labeled label="Buyer's name" hint="As written on the offer"><input name="buyer_name" maxLength={200} autoComplete="off" className={input} /></Labeled>
            </>
          ) : (
            <>
              <Labeled label="Home">
                <select name="property_id" value={listing} onChange={(e) => setListing(e.target.value)} className={input}>
                  <option value="">Not one of our listings</option>
                  {listings?.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
                </select>
              </Labeled>
              {!listing && <Labeled label="Property address"><input name="address" required maxLength={300} autoComplete="off" placeholder="123 Main St, City, ST" className={input} /></Labeled>}
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Labeled label="Offer price"><input name="amount" type="number" inputMode="numeric" required min={1} step={1} className={input} /></Labeled>
            <Labeled label="Earnest money"><input name="earnest" type="number" inputMode="numeric" min={0} step={1} className={input} /></Labeled>
            <Labeled label="Financing">
              <select name="financing" defaultValue="conventional" className={input}>
                {Object.entries(FINANCING).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Labeled>
            <Labeled label="Down payment %"><input name="down_pct" type="number" min={0} max={100} step={0.01} className={input} /></Labeled>
            <Labeled label="Seller credit" hint="Closing costs the seller pays back"><input name="seller_credit" type="number" inputMode="numeric" min={0} step={1} className={input} /></Labeled>
            <Labeled label="Closing date"><input name="close_on" type="date" className={input} /></Labeled>
          </div>

          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-1.5 text-muted">Contingencies</legend>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CONTINGENCIES).map(([v, l]) => (
                <label key={v} className="flex min-h-11 cursor-pointer items-center rounded-full bg-surface-1 px-4 has-[:checked]:bg-accent has-[:checked]:font-medium has-[:checked]:text-on-light has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
                  <input type="checkbox" name="contingencies" value={v} defaultChecked={v !== "home_sale"} className="sr-only" />{l}
                </label>
              ))}
            </div>
          </fieldset>

          <Labeled label="Respond by" hint="When the offer expires, if it says">
            <input type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} className={input} />
          </Labeled>
          <Labeled label="Notes"><textarea name="notes" rows={3} maxLength={5000} placeholder="Escalation clause, rent-back, inclusions…" className={`${input} resize-y`} /></Labeled>
          <button disabled={pending} className={`${primaryBtn} self-start`}>{pending ? "Saving…" : side === "seller" ? "Record offer" : "Save draft"}</button>
        </>
      )}
    </ActionForm>
  );
}
