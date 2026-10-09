"use client";

import { Check, Copy } from "lucide-react";
import { useState, useTransition } from "react";
import { saveNoteToLead } from "@/lib/actions";
import { input } from "./forms";

const pill = "flex min-h-10 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60";

/** Edit, copy, and (when the seller is set) log the weekly update on the seller's timeline. */
export function SellerUpdateCard({ draft, sellerId }: { draft: string; sellerId: string | null }) {
  const [text, setText] = useState(draft);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} aria-label="Weekly update" className={`${input} resize-y`} />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={pill} onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>
          {copied ? <Check aria-hidden className="size-4 text-accent" /> : <Copy aria-hidden className="size-4" />}{copied ? "Copied" : "Copy"}
        </button>
        {sellerId && (
          <button type="button" disabled={pending} className={pill} onClick={() => start(async () => { const r = await saveNoteToLead(sellerId, `Weekly update sent:\n${text}`); setMsg(r?.ok ?? r?.error ?? null); })}>
            {pending ? "Logging…" : "Log as sent"}
          </button>
        )}
        <span aria-live="polite" className="text-sm text-accent">{msg}</span>
      </div>
      {!sellerId && <p className="text-xs text-muted">Set the seller on this listing (Edit) to log updates on their timeline.</p>}
    </div>
  );
}
