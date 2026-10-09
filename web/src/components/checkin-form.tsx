"use client";

import { CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { submitCheckin } from "@/lib/actions";
import { ActionForm, Field, input, primaryBtn } from "./forms";

const RESET_MS = 6000; // a door tablet clears itself for the next visitor

/**
 * Open-house sign-in. Asks whether the visitor has an agent so nobody solicits a represented buyer (NAR Article 16).
 * Consent boxes are unticked and separate per channel (TCPA, CAN-SPAM).
 */
export function CheckinForm({ id, who }: { id: string; who: string }) {
  const [round, setRound] = useState(0); // remounts the form, clearing every field
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(next, RESET_MS);
    return () => clearTimeout(t);
  }, [sent]);

  function next() {
    setSent(false);
    setRound((r) => r + 1);
    setStartedAt(Date.now());
  }

  if (sent)
    return (
      <div role="status" className="flex animate-rise flex-col items-center gap-3 rounded-card bg-surface-2 p-10 text-center">
        <CircleCheck aria-hidden className="size-12 text-accent" />
        <h2 className="text-2xl">Thanks for visiting!</h2>
        <p className="text-muted">Enjoy the tour.</p>
        <button type="button" onClick={next} className="mt-2 min-h-11 rounded-full bg-surface-3 px-5 text-sm hover:bg-surface-1">Next visitor</button>
      </div>
    );

  const action = async (s: Parameters<typeof submitCheckin>[1], f: FormData) => {
    const res = await submitCheckin(id, s, f);
    if (res?.ok) setSent(true);
    return res;
  };

  return (
    <ActionForm key={round} action={action}>
      {(pending) => (
        <>
          <input type="hidden" name="t" value={startedAt} />
          <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
            <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <Field label="Name" name="name" required autoComplete="name" maxLength={200} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" name="email" type="email" autoComplete="email" maxLength={320} />
            <Field label="Phone" name="phone" type="tel" autoComplete="tel" maxLength={20} />
          </div>
          <p className="-mt-2 text-xs text-muted">Email or phone, whichever you prefer.</p>

          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-2 text-muted">Are you working with a real estate agent? <span aria-hidden>*</span></legend>
            <div className="grid grid-cols-2 gap-2">
              {[["no", "Not yet"], ["yes", "Yes, I have one"]].map(([v, l]) => (
                <label key={v} className="flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-surface-3 px-4 has-[:checked]:bg-accent has-[:checked]:font-medium has-[:checked]:text-on-light has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
                  <input type="radio" name="has_agent" value={v} required className="sr-only" />{l}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-2 text-muted">How do you like this home? <span className="text-xs">(optional)</span></legend>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex size-12 cursor-pointer items-center justify-center rounded-full bg-surface-3 has-[:checked]:bg-accent has-[:checked]:font-medium has-[:checked]:text-on-light has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
                  <input type="radio" name="rating" value={n} className="sr-only" aria-label={`${n} out of 5${n === 1 ? ", not for me" : n === 5 ? ", love it" : ""}`} />{n}
                </label>
              ))}
            </div>
            <span aria-hidden className="flex w-[17rem] justify-between text-xs text-muted"><span>Not for me</span><span>Love it</span></span>
          </fieldset>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Anything you&apos;d tell the seller? <span className="text-xs">(optional)</span></span>
            <textarea name="feedback" rows={2} maxLength={1000} placeholder="e.g. Loved the kitchen, the second bedroom felt small" className={`${input} resize-y`} />
          </label>

          <label className="flex gap-3 text-xs leading-relaxed text-muted">
            <input type="checkbox" name="consent_call_sms" className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
            <span>
              I agree to receive calls and text messages from {who} about homes like this one at the number above, which may be sent
              using automated technology. Consent isn&apos;t a condition of any purchase. Message and data rates may apply. Reply STOP to opt out.
            </span>
          </label>
          <label className="flex gap-3 text-xs leading-relaxed text-muted">
            <input type="checkbox" name="consent_email" className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
            <span>Email me similar listings and updates. Unsubscribe anytime.</span>
          </label>
          <button disabled={pending} className={`${primaryBtn} w-full`}>{pending ? "Signing in…" : "Sign in"}</button>
        </>
      )}
    </ActionForm>
  );
}
