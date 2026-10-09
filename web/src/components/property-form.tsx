"use client";

import { ActionForm, Field, input, primaryBtn } from "@/components/forms";
import { saveProperty } from "@/lib/actions";
import type { Property } from "@/lib/data";

const STATUSES = ["Active", "Coming soon", "Under contract", "Sold"];

/** New listing, or edit when `p` is given. */
export function PropertyForm({ p }: { p?: Property }) {
  return (
    <ActionForm action={saveProperty} className="grid gap-4 rounded-card bg-surface-2 p-6 sm:grid-cols-2">
      {(pending) => (
        <>
          {p && <input type="hidden" name="id" value={p.id} />}
          <Field label="Address" name="address" required autoFocus defaultValue={p?.address} />
          <Field label="Area" name="area" placeholder="Westside" defaultValue={p?.area} />
          <Field label="Price ($)" name="price" type="number" min={0} step={1000} required defaultValue={p?.price} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Status</span>
            <select name="status" className={input} defaultValue={p?.status}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <Field label="Beds" name="beds" type="number" min={0} defaultValue={p?.beds} />
          <Field label="Baths" name="baths" type="number" min={0} step={0.5} defaultValue={p?.baths} />
          <Field label="Sqft" name="sqft" type="number" min={0} defaultValue={p?.sqft} />
          <Field label="Features" name="features" hint="comma separated" placeholder="Backyard, Garage" defaultValue={p?.features.join(", ")} />
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            <span className="text-muted">Description</span>
            <textarea name="description" rows={4} className={`${input} resize-y`} defaultValue={p?.description} />
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
