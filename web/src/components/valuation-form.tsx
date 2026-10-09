"use client";

import { CircleCheck } from "lucide-react";
import { useState } from "react";
import { submitLeadForm } from "@/lib/actions";
import { ActionForm, Field, input, primaryBtn } from "./forms";

const TIMELINES = ["Just curious", "Within 3 months", "3 to 6 months", "6 to 12 months", "More than a year"];

/** "What's my home worth?" Goes through the same keyed, spam-checked lead pipeline as the contact form. */
export function ValuationForm({ formId, who, open }: { formId: string; who: string; open: boolean }) {
  const [startedAt] = useState(() => Date.now());
  const [sent, setSent] = useState(false);
  const [home, setHome] = useState({ address: "", beds: "", baths: "", sqft: "", timeline: TIMELINES[0], notes: "" });
  const set = (k: keyof typeof home) => (e: { target: { value: string } }) => setHome({ ...home, [k]: e.target.value });
  const message = [
    `Home value request: ${home.address}`,
    [home.beds && `${home.beds} bd`, home.baths && `${home.baths} ba`, home.sqft && `${home.sqft} sqft`].filter(Boolean).join(", "),
    `Thinking of selling: ${home.timeline}`,
    home.notes && `Notes: ${home.notes}`,
  ].filter(Boolean).join(". ");

  if (!open) return <p className="rounded-card bg-surface-2 p-8 text-center">This page isn&apos;t taking requests right now.</p>;
  if (sent)
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-card bg-surface-2 p-10 text-center">
        <CircleCheck aria-hidden className="size-10 text-accent" />
        <h1 className="text-2xl">Thanks, we&apos;re on it</h1>
        <p className="text-muted">{who} will prepare a market analysis for {home.address || "your home"} from recent nearby sales and get in touch.</p>
      </div>
    );

  const action = async (s: Parameters<typeof submitLeadForm>[1], f: FormData) => {
    const r = await submitLeadForm(formId, s, f);
    if (r?.ok) setSent(true);
    return r;
  };

  return (
    <div className="flex flex-col gap-6 rounded-card bg-surface-2 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-light">What&apos;s your home worth?</h1>
        <p className="mt-1 text-muted">Get a free market analysis from {who}, based on recent sales near you. No obligation.</p>
      </div>
      <ActionForm action={action}>
        {(pending) => (
          <>
            <input type="hidden" name="t" value={startedAt} />
            <input type="hidden" name="source" value="Home valuation" />
            <input type="hidden" name="message" value={message} />
            <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden"><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <Field label="Home address" name="home_address" required autoComplete="street-address" maxLength={200} value={home.address} onChange={set("address")} />
            <div className="grid grid-cols-3 gap-3">
              <Field label="Beds" name="beds" type="number" min={0} max={50} value={home.beds} onChange={set("beds")} />
              <Field label="Baths" name="baths" type="number" min={0} max={50} step={0.25} value={home.baths} onChange={set("baths")} />
              <Field label="Sqft" name="sqft" type="number" min={0} value={home.sqft} onChange={set("sqft")} />
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted">Thinking of selling?</span>
              <select value={home.timeline} onChange={set("timeline")} className={input}>{TIMELINES.map((t) => <option key={t}>{t}</option>)}</select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted">Updates or anything special <span className="text-xs">(optional)</span></span>
              <textarea rows={2} maxLength={500} value={home.notes} onChange={set("notes")} placeholder="e.g. new roof 2023, remodeled kitchen" className={`${input} resize-y`} />
            </label>
            <Field label="Your name" name="name" required autoComplete="name" maxLength={200} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" name="email" type="email" autoComplete="email" maxLength={320} />
              <Field label="Phone" name="phone" type="tel" autoComplete="tel" maxLength={20} />
            </div>
            <p className="-mt-2 text-xs text-muted">Email or phone, whichever you prefer.</p>
            <label className="flex gap-3 text-xs leading-relaxed text-muted">
              <input type="checkbox" name="consent_call_sms" className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
              <span>I agree to receive calls and text messages from {who} about my home&apos;s value at the number above, which may be sent using automated technology. Consent isn&apos;t a condition of any purchase. Message and data rates may apply. Reply STOP to opt out.</span>
            </label>
            <label className="flex gap-3 text-xs leading-relaxed text-muted">
              <input type="checkbox" name="consent_email" className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
              <span>Email me my analysis and market updates. Unsubscribe anytime.</span>
            </label>
            <button disabled={pending} className={`${primaryBtn} w-full`}>{pending ? "Sending…" : "Get my home value"}</button>
          </>
        )}
      </ActionForm>
      <p className="text-center text-xs text-muted"><a href={`/f/${formId}/privacy`} className="underline hover:text-ink">Your privacy choices</a> · Powered by EstateOS</p>
    </div>
  );
}
