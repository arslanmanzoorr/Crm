"use client";

import { Check, ListPlus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { addToShortlist, portalNote, removeFromShortlist, setShortlistNote } from "@/lib/actions";
import { money } from "@/lib/data";
import type { ShortlistItem } from "@/lib/db";
import { input } from "./forms";

const pill = "flex min-h-10 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60";

/** Lead page: the client's shortlist, their notes, and the agent's note on each home (the client sees it). */
export function AgentShortlist({ contactId, items }: { contactId: string; items: ShortlistItem[] }) {
  const [pending, start] = useTransition();
  if (items.length === 0) return <p className="text-sm text-muted">Nothing yet. Homes they save in their portal, and homes you add from &ldquo;Listings that fit&rdquo;, show here.</p>;
  return (
    <ul className="flex flex-col divide-y divide-white/5">
      {items.map((i) => (
        <li key={i.propertyId} className="flex flex-col gap-2 py-3">
          <div className="flex items-start justify-between gap-2">
            <a href={`/properties/${i.propertyId}`} className="min-w-0 break-words font-medium hover:text-accent">{i.address}</a>
            <button type="button" disabled={pending} aria-label={`Remove ${i.address} from their shortlist`} onClick={() => start(() => removeFromShortlist(contactId, i.propertyId))}
              className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-3 hover:text-ink"><X aria-hidden className="size-4" /></button>
          </div>
          <p className="text-xs text-muted">{money(i.price)} · {i.addedBy === "agent" ? "You suggested it" : "They saved it"}</p>
          {i.clientNote && <q className="text-sm text-ink/90">{i.clientNote}</q>}
          <NoteField label={`Your note on ${i.address} (they see it)`} value={i.agentNote} save={(t) => setShortlistNote(contactId, i.propertyId, t)} placeholder="Your note for them, e.g. HOA covers the roof" />
        </li>
      ))}
    </ul>
  );
}

export function AddToShortlist({ contactId, propertyId, on }: { contactId: string; propertyId: string; on: boolean }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  if (on) return <span className="flex min-h-10 items-center gap-1.5 text-sm text-accent"><Check aria-hidden className="size-4" />On their shortlist</span>;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} onClick={() => start(async () => { const r = await addToShortlist(contactId, propertyId); setErr(r?.error ?? null); })} className={pill}>
        <ListPlus aria-hidden className="size-4" />{pending ? "Adding…" : "Add to their shortlist"}
      </button>
      {err && <span role="alert" className="text-sm text-score-1">{err}</span>}
    </span>
  );
}

/** Client portal: their own note on a saved home (their agent sees it). */
export function PortalNote({ token, propertyId, value, address }: { token: string; propertyId: string; value: string; address: string }) {
  return <NoteField label={`Your note on ${address}`} value={value} save={(t) => portalNote(token, propertyId, t)} placeholder="A note for your agent, e.g. love the yard, worried about the road" />;
}

function NoteField({ label, value, save, placeholder }: { label: string; value: string; save: (t: string) => Promise<{ ok?: string; error?: string } | undefined>; placeholder: string }) {
  const [text, setText] = useState(value);
  const [saved, setSaved] = useState(value);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const commit = () => text.trim() !== saved.trim() && start(async () => {
    const r = await save(text);
    if (r?.ok) { setSaved(text); setMsg("Saved"); setTimeout(() => setMsg(null), 2000); } else setMsg(r?.error ?? "Couldn't save.");
  });
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="sr-only">{label}</span>
      <textarea rows={2} maxLength={500} value={text} disabled={pending} onChange={(e) => setText(e.target.value)} onBlur={commit} placeholder={placeholder} className={`${input} resize-y`} />
      <span aria-live="polite" className="text-xs text-muted">{pending ? "Saving…" : msg}</span>
    </label>
  );
}
