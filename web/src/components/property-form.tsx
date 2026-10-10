"use client";

import { ActionForm, Field, input, primaryBtn } from "@/components/forms";
import { saveProperty } from "@/lib/actions";
import type { Property } from "@/lib/data";
import { useState } from "react";
import { FEE_TYPES, HOME_TYPES, OTHER_FEE_SLOTS, PARKING, type Fee } from "@/lib/rental-feed";
import { DescriptionField } from "./fair-housing";

const STATUSES = ["Active", "Coming soon", "Under contract", "Sold"];

/** New listing, or edit when `p` is given. */
export function PropertyForm({ p, clients = [] }: { p?: Property; clients?: { id: string; name: string }[] }) {
  const [kind, setKind] = useState(p?.listingKind ?? "sale");
  const r = p?.rental;
  return (
    <ActionForm action={saveProperty} className="grid gap-4 rounded-card bg-surface-2 p-6 sm:grid-cols-2">
      {(pending) => (
        <>
          {p && <input type="hidden" name="id" value={p.id} />}
          <fieldset className="flex flex-wrap gap-2 sm:col-span-2">
            <legend className="sr-only">Listing type</legend>
            {(["sale", "rent"] as const).map((k) => (
              <label key={k} className="flex min-h-10 cursor-pointer items-center rounded-full bg-surface-3 px-4 text-sm has-[:checked]:bg-accent has-[:checked]:font-medium has-[:checked]:text-on-light has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
                <input type="radio" name="listing_kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />{k === "sale" ? "For sale" : "For rent"}
              </label>
            ))}
          </fieldset>
          <Field label="Address" name="address" required autoFocus defaultValue={p?.address} hint="as you'd say it" />
          <Field label="Area" name="area" placeholder="Westside" defaultValue={p?.area} />
          <Field label="Street" name="street" maxLength={200} placeholder="14 Oak Ave" defaultValue={r?.street ?? ""} />
          <Field label="Unit" name="unit" maxLength={20} placeholder="2B" defaultValue={r?.unit ?? ""} />
          <Field label="City" name="city" maxLength={100} defaultValue={r?.city ?? ""} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="State" name="state" maxLength={2} pattern="[A-Za-z]{2}" placeholder="TX" autoComplete="off" defaultValue={r?.state ?? ""} />
            <Field label="ZIP" name="zip" inputMode="numeric" pattern="\d{5}(-\d{4})?" placeholder="78701" defaultValue={r?.zip ?? ""} />
          </div>
          <Field label={kind === "rent" ? "Rent ($/month)" : "Price ($)"} name="price" type="number" min={0} step={1} required defaultValue={p?.price} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Status</span>
            <select name="status" className={input} defaultValue={p?.status}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <Field label="Beds" name="beds" type="number" min={0} defaultValue={p?.beds} />
          <Field label="Baths" name="baths" type="number" min={0} step={0.25} defaultValue={p?.baths} />
          <Field label="Sqft" name="sqft" type="number" min={0} defaultValue={p?.sqft} />
          <Field label="Features" name="features" hint="comma separated" placeholder="Backyard, Garage" defaultValue={p?.features.join(", ")} />
          <DescriptionField defaultValue={p?.description} />
          {kind === "rent" && <RentalFields r={r} />}
          {kind === "sale" && <Field label="Estimated rent ($/month)" name="est_rent" type="number" min={0} step={1} hint="For investors: cap rate and cash flow" defaultValue={p?.estRent ?? ""} />}
          <Field label="MLS number" name="mls_id" maxLength={30} pattern="[A-Za-z0-9\-]+" hint="Once it's on the MLS. Zillow, Realtor.com, Redfin and Homes.com get it from there." defaultValue={p?.mlsId ?? ""} />
          <Field label="Virtual tour link" name="tour_url" type="url" placeholder="https://" pattern="https://.*" defaultValue={p?.tourUrl ?? ""} />
          <Field label="Floor plan link" name="floor_plan_url" type="url" placeholder="https://" pattern="https://.*" defaultValue={p?.floorPlanUrl ?? ""} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Listing agreement ends</span>
            <input name="listing_expires" type="date" defaultValue={p?.listingExpires ?? ""} className={input} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="text-muted">Seller <span className="text-xs">(their client portal shows this listing&apos;s activity)</span></span>
            <select name="seller_id" defaultValue={p?.sellerId ?? ""} className={input}>
              <option value="">Not set</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="text-muted">Showing instructions <span className="text-xs">(team only)</span></span>
            <textarea name="showing_notes" rows={2} maxLength={1000} placeholder="Lockbox code, notice needed, pets, best times" className={`${input} resize-y`} defaultValue={p?.showingNotes} />
          </label>
          <button disabled={pending} className={`${primaryBtn} w-fit`}>{pending ? "Saving…" : "Save listing"}</button>
        </>
      )}
    </ActionForm>
  );
}

const select = (name: string, label: string, opts: Record<string, string>, v: string | null | undefined, blank = "Not set") => (
  <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">{label}</span>
    <select name={name} defaultValue={v ?? ""} className={input}>
      <option value="">{blank}</option>{Object.entries(opts).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
    </select>
  </label>
);
const tri = (v: boolean | null | undefined) => (v === true ? "yes" : v === false ? "no" : "");

/** What renters (and Zillow's rental feed) need: home type, lease, pets, parking, and every fee up front. */
function RentalFields({ r }: { r?: Property["rental"] }) {
  const fee = (t: keyof typeof FEE_TYPES) => r?.fees.find((f: Fee) => f.type === t)?.amount ?? "";
  const others = r?.fees.filter((f: Fee) => f.type === "customFee") ?? [];
  return (
    <fieldset className="grid gap-4 rounded-2xl bg-surface-3/50 p-4 sm:col-span-2 sm:grid-cols-2">
      <legend className="px-1 text-sm font-medium">Rental details</legend>
      {select("home_type", "Home type", HOME_TYPES, r?.homeType)}
      {select("lease_months", "Lease", { "0": "Month to month", "6": "6 months", "12": "12 months", "18": "18 months", "24": "24 months" }, r?.leaseMonths?.toString())}
      <Field label="Available" name="available_on" type="date" defaultValue={r?.availableOn ?? ""} />
      {select("parking", "Parking", PARKING, r?.parking)}
      {select("cats_ok", "Cats", { yes: "Allowed", no: "Not allowed" }, tri(r?.catsOk))}
      {select("dogs_ok", "Dogs", { yes: "Allowed", no: "Not allowed" }, tri(r?.dogsOk))}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="furnished" defaultChecked={r?.furnished} className="size-5 accent-[var(--color-accent)]" /> Furnished
      </label>
      <p className="text-sm text-muted sm:col-span-2">Fees. Many states require listing every fee up front; Zillow shows these to renters. Leave blank if none.</p>
      {(Object.keys(FEE_TYPES) as (keyof typeof FEE_TYPES)[]).filter((t) => t !== "customFee").map((t) => (
        <Field key={t} label={`${FEE_TYPES[t].label} ($)`} name={`fee_${t}`} type="number" min={0} step="any" defaultValue={fee(t)} />
      ))}
      {Array.from({ length: OTHER_FEE_SLOTS }, (_, i) => (
        <div key={i} className="grid grid-cols-[1fr_8rem] gap-3 sm:col-span-2">
          <Field label={`Other monthly fee ${i + 1}`} name={`other_name_${i + 1}`} maxLength={60} placeholder="Trash, utilities…" defaultValue={others[i]?.name ?? ""} />
          <Field label="$ / month" name={`other_amount_${i + 1}`} type="number" min={0} step="any" defaultValue={others[i]?.amount ?? ""} />
        </div>
      ))}
    </fieldset>
  );
}
