"use client";

import Link from "next/link";
import { ActionForm, Field, input, primaryBtn } from "@/components/forms";
import { createLead } from "@/lib/actions";

const TYPES = ["buyer", "seller", "renter", "investor", "landlord", "vendor"];

export default function NewLeadPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link href="/leads" className="text-sm text-muted hover:text-accent">← All leads</Link>
      <h1 className="text-4xl font-light">New lead</h1>
      <ActionForm action={createLead} className="grid gap-4 rounded-card bg-surface-2 p-6 sm:grid-cols-2">
        {(pending) => (
          <>
            <Field label="Name" name="name" required autoFocus />
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted">Type</span>
              <select name="type" className={input}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            </label>
            <Field label="Email" name="email" type="email" />
            <Field label="Phone" name="phone" type="tel" placeholder="+15550100001" />
            <Field label="Budget" name="budget" placeholder="$600k–$650k" />
            <Field label="Source" name="sources" hint="comma separated" placeholder="Zillow, Instagram" />
            <Field label="Areas" name="areas" hint="comma separated" placeholder="Westside, Oak Park" />
            <Field label="Wants" name="preferences" hint="comma separated" placeholder="3 bed, Garage" />
            <fieldset className="flex flex-wrap gap-4 text-sm sm:col-span-2">
              <legend className="mb-2 text-muted">Consent to contact (TCPA / CAN-SPAM)</legend>
              {[["consent_call", "Calls"], ["consent_sms", "Texts"], ["consent_email", "Email"]].map(([n, l]) => (
                <label key={n} className="flex items-center gap-2"><input type="checkbox" name={n} className="size-4 accent-[var(--color-accent)]" /> {l}</label>
              ))}
            </fieldset>
            <button disabled={pending} className={`${primaryBtn} w-fit`}>{pending ? "Saving…" : "Save lead"}</button>
          </>
        )}
      </ActionForm>
    </div>
  );
}
