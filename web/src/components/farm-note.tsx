"use client";

import { Check, Copy } from "lucide-react";
import { useState, useTransition } from "react";
import { saveNoteToLead } from "@/lib/actions";
import { input } from "./forms";

const pill = "flex min-h-10 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1 disabled:opacity-60";

/** The market note: edit, copy, and log it on each neighbor's timeline as you send it. */
export function FarmNote({ draft, due }: { draft: string; due: { id: string; name: string; email: boolean }[] }) {
  const [text, setText] = useState(draft);
  const [copied, setCopied] = useState(false);
  const [logged, setLogged] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const first = (name: string) => name.trim().split(/\s+/)[0] || "there";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} aria-label="Market note" className={`${input} resize-y`} />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={pill} onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}>
            {copied ? <Check aria-hidden className="size-4 text-accent" /> : <Copy aria-hidden className="size-4" />}{copied ? "Copied" : "Copy"}
          </button>
          {due.length > 0 && <span className="text-xs text-muted">{"{first_name}"} is filled in for each lead you log it on.</span>}
        </div>
      </div>
      {due.length > 0 && (
        <ul className="flex flex-col divide-y divide-white/5">
          {due.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <a href={`/leads/${p.id}`} className="min-w-0 break-words hover:text-accent">{p.name}{!p.email && <span className="text-xs text-muted"> · no email consent</span>}</a>
              {logged.has(p.id)
                ? <span className="flex min-h-10 items-center gap-1.5 text-sm text-accent"><Check aria-hidden className="size-4" />Logged</span>
                : <button type="button" disabled={pending} className={pill}
                    onClick={() => start(async () => {
                      const r = await saveNoteToLead(p.id, `Market note sent:\n${text.replaceAll("{first_name}", first(p.name))}`);
                      if (r?.ok) setLogged((s) => new Set(s).add(p.id));
                    })}>Log as sent</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
