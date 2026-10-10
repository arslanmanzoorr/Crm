"use client";

import { Check, Copy } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { deleteRentalFeed, saveRentalFeed } from "@/lib/actions";
import type { RentalFeedInfo } from "@/lib/db";
import { input, primaryBtn } from "./forms";
import { LocalTime } from "./local-time";

const pill = "flex min-h-10 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60";

/** Zillow Rental Network feed: contact details renters reach, the secret feed URL (shown once), and status. */
export function RentalFeedSettings({ feed, canEdit }: { feed: RentalFeedInfo; canEdit: boolean }) {
  const [state, run, pending] = useActionState(saveRentalFeed, undefined);
  const [copied, setCopied] = useState(false);
  const [armed, setArmed] = useState(false);
  const [removing, startRemove] = useTransition();
  if (!canEdit) return <p className="text-sm text-muted">{feed ? "The team's rentals feed is on." : "An owner or admin can turn on the rentals feed."}</p>;
  const url = state && "url" in state ? state.url : undefined;
  return (
    <div className="flex flex-col gap-4 rounded-card bg-surface-2 p-5 sm:p-6">
      {feed && (
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-muted">Rentals in the feed</dt><dd className="text-lg">{feed.listings}</dd></div>
          <div><dt className="text-muted">Zillow last read it</dt><dd className="text-lg">{feed.lastFetchedAt ? <LocalTime ts={feed.lastFetchedAt} /> : "Not yet"}</dd></div>
          <div><dt className="text-muted">Inquiries go to</dt><dd className="break-words">{feed.contactEmail}</dd></div>
        </dl>
      )}
      {url ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-accent">{state?.ok}</p>
          <code className="break-all rounded-2xl bg-surface-1 p-3 text-sm">{url}</code>
          <button type="button" className={`${pill} w-fit`} onClick={() => navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>
            {copied ? <Check aria-hidden className="size-4 text-accent" /> : <Copy aria-hidden className="size-4" />}{copied ? "Copied" : "Copy feed URL"}
          </button>
          <p className="text-sm text-muted">
            Send this URL to Zillow Rentals for approval through their <a href="https://www.zillow.com/rentals-network/" target="_blank" rel="noreferrer" className="text-accent underline">Rental Network</a> feed program (rentalfeeds@zillow.com). Approved feeds also reach Trulia and HotPads.
          </p>
        </div>
      ) : (
        <form action={run} className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Contact name</span><input name="name" maxLength={100} defaultValue={feed?.contactName} className={input} /></label>
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Inquiry email *</span><input name="email" type="email" required maxLength={320} defaultValue={feed?.contactEmail} className={input} /></label>
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Phone *</span><input name="phone" type="tel" required defaultValue={feed?.contactPhone} className={input} /></label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
            <button disabled={pending} className={primaryBtn}>{pending ? "Saving…" : feed ? "Save and make a new feed URL" : "Turn on the rentals feed"}</button>
            {feed && (
              <button type="button" disabled={removing} onBlur={() => setArmed(false)} onClick={() => (armed ? startRemove(() => deleteRentalFeed()) : setArmed(true))}
                className={`min-h-11 rounded-full px-4 text-sm ${armed ? "bg-score-1 font-medium text-on-light" : "text-muted hover:bg-surface-3 hover:text-score-1"}`}>
                {armed ? "Press again: Zillow removes every rental" : "Turn off"}
              </button>
            )}
          </div>
          {feed && <p className="text-xs text-muted sm:col-span-3">A new URL replaces the old one. Send the new one to Zillow, or your rentals drop off.</p>}
          {state?.error && <p role="alert" className="text-sm text-score-1 sm:col-span-3">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
