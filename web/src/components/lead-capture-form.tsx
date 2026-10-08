"use client";

import { CircleCheck } from "lucide-react";
import { useState } from "react";
import { submitLeadForm } from "@/lib/actions";
import { ActionForm, Field, input, primaryBtn } from "./forms";

/** Public inquiry form. Consent boxes are unticked by default and separate per channel (TCPA, CAN-SPAM). */
export function LeadCaptureForm({ formId, who, open, source }: { formId: string; who: string; open: boolean; source: string }) {
  const [startedAt] = useState(() => Date.now());
  const [sent, setSent] = useState(false);

  if (!open)
    return <p className="rounded-card bg-surface-2 p-8 text-center">This form isn&apos;t taking inquiries right now.</p>;

  if (sent)
    return (
      <div className="flex animate-rise flex-col items-center gap-3 rounded-card bg-surface-2 p-10 text-center">
        <CircleCheck aria-hidden className="size-10 text-accent" />
        <h1 className="text-2xl">Thanks, we got it</h1>
        <p className="text-muted">Someone from {who} will reach out soon.</p>
      </div>
    );

  const action = async (s: Parameters<typeof submitLeadForm>[1], f: FormData) => {
    const res = await submitLeadForm(formId, s, f);
    if (res?.ok) setSent(true);
    return res;
  };

  return (
    <div className="flex flex-col gap-6 rounded-card bg-surface-2 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-light">Get in touch</h1>
        <p className="mt-1 text-muted">Tell {who} what you&apos;re looking for. We usually reply within the hour.</p>
      </div>
      <ActionForm action={action}>
        {(pending) => (
          <>
            <input type="hidden" name="t" value={startedAt} />
            <input type="hidden" name="source" value={source} />
            {/* Honeypot: invisible to people, irresistible to bots. */}
            <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
              <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
            </div>
            <Field label="Name" name="name" required autoComplete="name" maxLength={200} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" name="email" type="email" autoComplete="email" maxLength={320} />
              <Field label="Phone" name="phone" type="tel" autoComplete="tel" maxLength={20} />
            </div>
            <p className="-mt-2 text-xs text-muted">Email or phone, whichever you prefer.</p>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted">What are you looking for?</span>
              <textarea name="message" rows={3} maxLength={2000} placeholder="e.g. 3-bed in Westside under $650k, moving this summer" className={`${input} resize-y`} />
            </label>
            <label className="flex gap-3 text-xs leading-relaxed text-muted">
              <input type="checkbox" name="consent_call_sms" className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
              <span>
                I agree to receive calls and text messages from {who} about my inquiry at the number above, which may be sent using
                automated technology. Consent isn&apos;t a condition of any purchase. Message and data rates may apply. Reply STOP to opt out.
              </span>
            </label>
            <label className="flex gap-3 text-xs leading-relaxed text-muted">
              <input type="checkbox" name="consent_email" className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
              <span>Email me listings and updates. Unsubscribe anytime.</span>
            </label>
            <button disabled={pending} className={`${primaryBtn} w-full`}>{pending ? "Sending…" : "Send"}</button>
          </>
        )}
      </ActionForm>
      <p className="text-center text-xs text-muted">Powered by EstateOS</p>
    </div>
  );
}
