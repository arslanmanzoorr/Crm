"use client";

import Link from "next/link";
import { ActionForm, Field, input, primaryBtn } from "@/components/forms";
import { createProperty } from "@/lib/actions";

const STATUSES = ["Active", "Coming soon", "Under contract", "Sold"];

export default function NewPropertyPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href="/properties" className="text-sm text-muted hover:text-accent">← All properties</Link>
      <h1 className="text-4xl font-light">New listing</h1>
      <ActionForm action={createProperty} className="grid gap-4 rounded-card bg-surface-2 p-6 sm:grid-cols-2">
        {(pending) => (
          <>
            <Field label="Address" name="address" required autoFocus />
            <Field label="Area" name="area" placeholder="Westside" />
            <Field label="Price ($)" name="price" type="number" min={0} step={1000} required />
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted">Status</span>
              <select name="status" className={input}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <Field label="Beds" name="beds" type="number" min={0} />
            <Field label="Baths" name="baths" type="number" min={0} step={0.5} />
            <Field label="Sqft" name="sqft" type="number" min={0} />
            <Field label="Features" name="features" hint="comma separated" placeholder="Backyard, Garage" />
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="text-muted">Description</span>
              <textarea name="description" rows={4} className={`${input} resize-y`} />
            </label>
            <button disabled={pending} className={`${primaryBtn} w-fit`}>{pending ? "Saving…" : "Save listing"}</button>
          </>
        )}
      </ActionForm>
    </div>
  );
}
