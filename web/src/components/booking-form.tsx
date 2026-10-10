"use client";

import { CircleCheck } from "lucide-react";
import { useState } from "react";
import { bookShowing } from "@/lib/actions";
import { money } from "@/lib/data";
import { openSlots } from "@/lib/showings";
import { ActionForm, Field, input, primaryBtn } from "./forms";
import { useNow } from "./header";

export type Bookable = { id: string; address: string; area: string; price: number; beds: number; baths: number; rent: boolean; busy: [string, string][] };

const chip = "relative flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-surface-3 px-3.5 text-sm has-[:checked]:bg-accent has-[:checked]:font-medium has-[:checked]:text-on-light has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent";
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Pick a home, a day and a half hour; times show in the visitor's own clock. Same spam checks as the lead form. */
export function BookingForm({ formId, team, listings, initial }: { formId: string; team: string; listings: Bookable[]; initial: string }) {
  const Team = team.charAt(0).toUpperCase() + team.slice(1);
  const now = useNow();
  const [startedAt] = useState(() => Date.now());
  const [listingId, setListingId] = useState(listings.some((l) => l.id === initial) ? initial : listings[0]?.id ?? "");
  const [day, setDay] = useState<string | null>(null);
  const [sent, setSent] = useState<{ when: string; address: string } | null>(null);
  const listing = listings.find((l) => l.id === listingId);

  if (listings.length === 0) return <p className="rounded-card bg-surface-2 p-8 text-center">No homes are open for showings right now.</p>;
  if (sent)
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-card bg-surface-2 p-10 text-center">
        <CircleCheck aria-hidden className="size-10 text-accent" />
        <h1 className="text-2xl">Showing requested</h1>
        <p className="text-muted">{sent.address}, {sent.when}. {Team} will confirm with you shortly.</p>
      </div>
    );
  if (!now || !listing) return <div className="h-[720px] rounded-card bg-surface-2" />;

  const slots = openSlots(now, listing.busy);
  const days = [...new Map(slots.map((s) => [dayKey(s), s])).values()];
  const activeDay = day && days.some((d) => dayKey(d) === day) ? day : days[0] && dayKey(days[0]);
  const times = slots.filter((s) => dayKey(s) === activeDay);
  const fmtDay = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const fmtTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const action = async (s: Parameters<typeof bookShowing>[1], f: FormData) => {
    const r = await bookShowing(formId, s, f);
    const at = new Date(String(f.get("starts_at")));
    if (r?.ok) setSent({ address: listing.address, when: `${fmtDay(at)} at ${fmtTime(at)}` });
    return r;
  };

  return (
    <div className="flex flex-col gap-6 rounded-card bg-surface-2 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-light">Book a showing</h1>
        <p className="mt-1 text-muted">Pick a home and a time. {Team} confirms every request.</p>
      </div>
      <ActionForm action={action}>
        {(pending) => (
          <>
            <input type="hidden" name="t" value={startedAt} />
            <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden"><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted">Home</span>
              <select name="property" value={listingId} onChange={(e) => { setListingId(e.target.value); setDay(null); }} className={input}>
                {listings.map((l) => <option key={l.id} value={l.id}>{l.address}{l.area ? `, ${l.area}` : ""} · {money(l.price)}{l.rent ? "/mo" : ""}</option>)}
              </select>
              <span className="text-xs text-muted">{listing.beds} bed · {listing.baths} bath</span>
            </label>
            {slots.length === 0 ? <p className="text-sm text-muted">No open times this week. Leave your details on the contact form and we&apos;ll find one.</p> : (
              <>
                <fieldset className="flex min-w-0 flex-col gap-2">
                  <legend className="mb-1.5 text-sm text-muted">Day</legend>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {days.map((d) => (
                      <label key={dayKey(d)} className={`${chip} shrink-0`}>
                        <input type="radio" name="day" checked={dayKey(d) === activeDay} onChange={() => setDay(dayKey(d))} className="sr-only" />{fmtDay(d)}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="flex min-w-0 flex-col gap-2">
                  <legend className="mb-1.5 text-sm text-muted">Time <span className="text-xs">(your time)</span></legend>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {times.map((t) => (
                      <label key={t.toISOString()} className={chip}>
                        <input type="radio" name="starts_at" value={t.toISOString()} required className="sr-only" />{fmtTime(t)}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
            <Field label="Your name" name="name" required autoComplete="name" maxLength={200} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" name="email" type="email" autoComplete="email" maxLength={320} />
              <Field label="Phone" name="phone" type="tel" autoComplete="tel" maxLength={20} />
            </div>
            <p className="-mt-2 text-xs text-muted">Email or phone, so we can confirm.</p>
            <label className="flex gap-3 text-xs leading-relaxed text-muted">
              <input type="checkbox" name="consent_call_sms" className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
              <span>I agree to receive calls and text messages from {team} about this showing and similar homes at the number above, which may be sent using automated technology. Consent isn&apos;t a condition of any purchase. Message and data rates may apply. Reply STOP to opt out.</span>
            </label>
            <label className="flex gap-3 text-xs leading-relaxed text-muted">
              <input type="checkbox" name="consent_email" className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
              <span>Email me about this showing and homes like it. Unsubscribe anytime.</span>
            </label>
            <button disabled={pending || slots.length === 0} className={`${primaryBtn} w-full`}>{pending ? "Requesting…" : "Request this showing"}</button>
          </>
        )}
      </ActionForm>
    </div>
  );
}
