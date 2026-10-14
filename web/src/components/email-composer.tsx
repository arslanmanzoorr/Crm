"use client";

import { Mail } from "lucide-react";
import { useState, useTransition } from "react";
import { sendLeadEmail } from "@/lib/actions";
import { input, primaryBtn } from "./forms";

/** Write and send an email to this lead from the agent's own Gmail. Logged on the timeline. */
export function EmailComposer({ contactId, to, from }: { contactId: string; to: string; from: string }) {
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <details className="rounded-card bg-surface-2 p-5">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-lg"><Mail aria-hidden className="size-5" /> Email</summary>
      <form className="mt-3 flex flex-col gap-3 text-sm" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await sendLeadEmail(contactId, subject, text); setMsg(r ?? null); if (r?.ok) { setSubject(""); setText(""); } }); }}>
        <p className="text-muted">From {from} to {to}</p>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required placeholder="Subject" aria-label="Subject" className={input} />
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={20000} required rows={8} placeholder="Write your message" aria-label="Message" className={`${input} resize-y`} />
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={pending || !subject.trim() || !text.trim()} className={`${primaryBtn} w-fit`}>{pending ? "Sending…" : "Send"}</button>
          {msg?.error && <span role="alert" className="text-score-1">{msg.error}</span>}
          {msg?.ok && <span role="status" className="text-muted">{msg.ok}</span>}
        </div>
      </form>
    </details>
  );
}
