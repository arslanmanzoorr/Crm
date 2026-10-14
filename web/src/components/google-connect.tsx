"use client";

import { useTransition } from "react";
import { disconnectGoogle } from "@/lib/actions";

const MSG: Record<string, string> = {
  connected: "Google connected.", cancelled: "Google connection cancelled.", failed: "Couldn't connect Google. Try again.",
  scopes: "Google connected without the permissions we need. Connect again and tick both boxes (send email, calendar).", unavailable: "Google isn't set up on the server yet.",
};

/** Connect or disconnect the user's own Google account (Gmail send + Calendar events). */
export function GoogleConnect({ email, ready, status }: { email: string | null; ready: boolean; status?: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface-2 p-5 text-sm">
      {status && MSG[status] && <p role="status" className={status === "connected" ? "text-accent" : "text-score-1"}>{MSG[status]}</p>}
      {email ? (
        <>
          <p>Connected as <span className="font-medium">{email}</span>. Emails to leads go from your Gmail, and showings you book appear on your Google Calendar.</p>
          <button type="button" disabled={pending} onClick={() => start(() => disconnectGoogle())} className="flex min-h-10 w-fit items-center rounded-full bg-surface-3 px-3.5 hover:bg-surface-1 disabled:opacity-60">{pending ? "Disconnecting…" : "Disconnect Google"}</button>
        </>
      ) : ready ? (
        <>
          <p className="text-muted">Send emails to leads from your own Gmail and put showings on your Google Calendar. EstateOS can only send mail you write and add calendar events; it can&apos;t read your inbox.</p>
          {/* A plain link: the server starts Google's sign-in. */}
          <a href="/api/google/connect" className="flex min-h-11 w-fit items-center rounded-full bg-accent px-5 font-medium text-on-light hover:bg-accent-strong">Connect Google</a>
        </>
      ) : <p className="text-muted">Not set up on the server yet: add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_TOKEN_KEY.</p>}
    </div>
  );
}
