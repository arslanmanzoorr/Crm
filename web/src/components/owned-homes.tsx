"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteOwnedHome, saveOwnedHome } from "@/lib/actions";
import { money } from "@/lib/data";
import type { Holding } from "@/lib/db";
import { portfolio } from "@/lib/finance";
import { FarmNote } from "./farm-note";
import { ActionForm, input, primaryBtn } from "./forms";

const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

/** Homes the client owns: equity at a glance, and rental yield when they're an investor. */
export function OwnedHomes({ contactId, homes, updates, lead }: { contactId: string; homes: Holding[]; updates?: Record<string, string>; lead?: { id: string; name: string; email: boolean } }) {
  const p = portfolio(homes);
  return (
    <div className="flex flex-col gap-4">
      {homes.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-muted">Value</dt><dd className="text-lg">{money(p.value)}</dd></div>
          <div><dt className="text-muted">Equity</dt><dd className="text-lg">{money(p.equity)}</dd></div>
          {p.appreciationPct !== null && <div><dt className="text-muted">Since purchase</dt><dd>{pct(p.appreciationPct)}</dd></div>}
          {p.yieldPct !== null && <div><dt className="text-muted">Net rent</dt><dd>{money(p.annualNet)}/yr · {p.yieldPct.toFixed(1)}%</dd></div>}
        </dl>
      )}
      {homes.length > 0 && (
        <ul className="flex flex-col divide-y divide-white/5">
          {homes.map((h) => (
            <li key={h.id} className="flex flex-col gap-1 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 break-words font-medium">{h.address}</p>
                <DeleteHome id={h.id} contactId={contactId} address={h.address} />
              </div>
              <p className="text-sm text-muted">
                {[h.valueEstimate !== null && `Worth ~${money(h.valueEstimate)}`,
                  h.purchasePrice !== null && `bought ${money(h.purchasePrice)}${h.purchasedOn ? ` in ${h.purchasedOn.slice(0, 4)}` : ""}`,
                  h.loanBalance > 0 && `owes ${money(h.loanBalance)}`,
                  h.monthlyRent > 0 && `rents ${money(h.monthlyRent)}/mo`].filter(Boolean).join(" · ") || "No numbers yet"}
              </p>
              {h.notes && <p className="text-sm">{h.notes}</p>}
              {updates?.[h.id] && lead && (
                <details>
                  <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">Send a home update</summary>
                  <div className="mt-2"><FarmNote label="Home update" draft={updates[h.id]} due={[lead]} /></div>
                </details>
              )}
              <details>
                <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">Update</summary>
                <HomeForm contactId={contactId} h={h} />
              </details>
            </li>
          ))}
        </ul>
      )}
      <details>
        <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">Add a home they own</summary>
        <HomeForm contactId={contactId} />
      </details>
    </div>
  );
}

function HomeForm({ contactId, h }: { contactId: string; h?: Holding }) {
  const field = (name: string, label: string, v: number | null | undefined, hint?: string) => (
    <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">{label}</span>
      <input name={name} type="number" inputMode="numeric" min={0} step="any" defaultValue={v || ""} placeholder={hint} className={input} />
    </label>
  );
  return (
    <ActionForm action={saveOwnedHome} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
      {(pending) => (
        <>
          <input type="hidden" name="contact_id" value={contactId} />
          {h && <input type="hidden" name="id" value={h.id} />}
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2 lg:col-span-1"><span className="text-muted">Address</span>
            <input name="address" required maxLength={300} defaultValue={h?.address} className={input} />
          </label>
          {field("purchase_price", "Bought for", h?.purchasePrice)}
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Bought on</span>
            <input name="purchased_on" type="date" defaultValue={h?.purchasedOn ?? ""} className={input} />
          </label>
          {field("value_estimate", "Worth today (estimate)", h?.valueEstimate, "From your CMA")}
          {field("loan_balance", "Loan balance", h?.loanBalance)}
          {field("monthly_rent", "Rent per month", h?.monthlyRent, "Rentals only")}
          {field("monthly_costs", "Costs per month", h?.monthlyCosts, "Tax, insurance, HOA, upkeep")}
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2 lg:col-span-1"><span className="text-muted">Notes</span>
            <input name="notes" maxLength={2000} defaultValue={h?.notes} className={input} />
          </label>
          <button disabled={pending} className={`${primaryBtn} w-fit`}>{pending ? "Saving…" : h ? "Save" : "Add home"}</button>
        </>
      )}
    </ActionForm>
  );
}

function DeleteHome({ id, contactId, address }: { id: string; contactId: string; address: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onBlur={() => setArmed(false)} aria-label={armed ? `Press again to remove ${address}` : `Remove ${address}`}
      onClick={() => (armed ? start(() => deleteOwnedHome(id, contactId)) : setArmed(true))}
      className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm ${armed ? "bg-score-1 font-medium text-on-light" : "text-muted hover:bg-surface-3 hover:text-score-1"}`}>
      <Trash2 aria-hidden className="size-4" />{armed && "Remove?"}
    </button>
  );
}
