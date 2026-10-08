"use client";

import { ActionForm, Field, input, primaryBtn } from "@/components/forms";
import { saveLead } from "@/lib/actions";
import type { Lead } from "@/lib/data";

const TYPES = ["buyer", "seller", "renter", "investor", "landlord", "vendor"];

/** New lead, or edit when `lead` is given. */
export function LeadForm({ lead }: { lead?: Lead }) {
  const c = lead?.consent;
  return (
    <ActionForm action={saveLead} className="grid gap-4 rounded-card bg-surface-2 p-6 sm:grid-cols-2">
      {(pending) => (
        <>
          {lead && <input type="hidden" name="id" value={lead.id} />}
          <Field label="Name" name="name" required autoFocus defaultValue={lead?.name} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Type</span>
            <select name="type" className={input} defaultValue={lead?.type}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </label>
          <Field label="Email" name="email" type="email" defaultValue={lead?.email} />
          <Field label="Phone" name="phone" type="tel" placeholder="+15550100001" defaultValue={lead?.phone} />
          <Field label="Budget" name="budget" placeholder="$600k–$650k" defaultValue={lead?.budget} />
          <Field label="Source" name="sources" hint="comma separated" placeholder="Zillow, Instagram" defaultValue={lead?.sources.join(", ")} />
          <Field label="Areas" name="areas" hint="comma separated" placeholder="Westside, Oak Park" defaultValue={lead?.areas.join(", ")} />
          <Field label="Wants" name="preferences" hint="comma separated" placeholder="3 bed, Garage" defaultValue={lead?.preferences.join(", ")} />
          <fieldset className="flex flex-wrap gap-4 text-sm sm:col-span-2">
            <legend className="mb-2 text-muted">Consent to contact (TCPA / CAN-SPAM)</legend>
            {([["consent_call", "Calls", c?.call], ["consent_sms", "Texts", c?.sms], ["consent_email", "Email", c?.email], ["dnc", "Do not contact", c?.dnc]] as const).map(([n, l, v]) => (
              <label key={n} className="flex items-center gap-2"><input type="checkbox" name={n} defaultChecked={v} className="size-4 accent-[var(--color-accent)]" /> {l}</label>
            ))}
          </fieldset>
          <button disabled={pending} className={`${primaryBtn} w-fit`}>{pending ? "Saving…" : "Save lead"}</button>
        </>
      )}
    </ActionForm>
  );
}
