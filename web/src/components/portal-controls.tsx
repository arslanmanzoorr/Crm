"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useState, useTransition } from "react";
import { createPortalLink, revokePortalLinks } from "@/lib/actions";
import type { PortalLinkInfo } from "@/lib/db";
import { LocalTime } from "./local-time";

const pill = "flex min-h-10 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60";

/** Create, copy (once) and revoke a client's private portal link. */
export function PortalControls({ contactId, link }: { contactId: string; link: PortalLinkInfo }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const create = () => start(async () => { const r = await createPortalLink(contactId); setUrl(r.url ?? null); setError(r.error ?? null); setArmed(false); });

  return (
    <div className="flex flex-col gap-3 text-sm">
      {link ? (
        <p className="text-ink/80">
          Link active · {link.lastSeenAt ? <>last opened <LocalTime ts={link.lastSeenAt} /></> : "not opened yet"} · expires <LocalTime ts={link.expiresAt} opts={{ month: "short", day: "numeric", year: "numeric" }} />
        </p>
      ) : <p className="text-muted">Share a private page where this client sees their showings, offers, deal milestones and what they still need to send, and can message you.</p>}

      {url && (
        <div className="flex flex-col gap-2 rounded-2xl bg-surface-1 p-3">
          <p className="text-xs text-muted">Copy it now: for security we only store a fingerprint, so this exact link can&apos;t be shown again.</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate text-xs">{url}</code>
            <button type="button" className={pill} onClick={() => navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>
              {copied ? <Check aria-hidden className="size-4 text-accent" /> : <Copy aria-hidden className="size-4" />}{copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-score-1">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={create} className={pill}><Link2 aria-hidden className="size-4" />{pending ? "Creating…" : link ? "New link (replaces the old one)" : "Create portal link"}</button>
        {link && (
          <button type="button" disabled={pending} onBlur={() => setArmed(false)}
            onClick={() => (armed ? start(async () => { await revokePortalLinks(contactId); setUrl(null); setArmed(false); }) : setArmed(true))}
            className={`min-h-10 rounded-full px-3.5 text-sm ${armed ? "bg-score-1 font-medium text-on-light" : "text-score-1 hover:bg-surface-3"}`}>
            {armed ? "Press again to turn off" : "Turn off link"}
          </button>
        )}
      </div>
    </div>
  );
}
