"use client";

import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { input } from "./forms";

type Msg = { from: "visitor" | "assistant"; text: string };

/** Public website chat: answers questions about the team's listings and points to the contact form and booking. */
export function WebChat({ formId }: { formId: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "assistant", text: "Hi! Ask me about our homes for sale or rent, or how buying and selling works." }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [msgs, busy]);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { from: "visitor" as const, text: q.slice(0, 600) }];
    setMsgs(next); setText(""); setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/chat/${formId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next.slice(1) }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Chat is busy right now.");
      setMsgs([...next, { from: "assistant", text: j.text }]);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <section aria-labelledby="chat-title" className="flex flex-col gap-4 rounded-card bg-surface-2 p-6">
      <h1 id="chat-title" className="text-2xl font-light">Ask a question</h1>
      <div role="log" aria-live="polite" className="flex max-h-[55dvh] flex-col gap-2 overflow-y-auto">
        {msgs.map((m, i) => (
          <p key={i} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.from === "visitor" ? "self-end bg-accent text-on-light" : "self-start bg-surface-3"}`}>
            <span className="sr-only">{m.from === "visitor" ? "You: " : "Assistant: "}</span>{m.text}
          </p>
        ))}
        {busy && <p className="self-start rounded-2xl bg-surface-3 px-4 py-2.5 text-sm text-muted">Typing…</p>}
        <div ref={end} />
      </div>
      {err && <p role="alert" className="text-sm text-score-1">{err}</p>}
      <form onSubmit={send} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={600} placeholder="Type your question" aria-label="Your question" className={`${input} flex-1`} />
        <button disabled={busy || !text.trim()} aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-on-light disabled:opacity-60"><Send aria-hidden className="size-4" /></button>
      </form>
      <p className="text-xs text-muted">Automated answers from listing details; an agent follows up on anything else. Don&apos;t share personal details here. <a href={`/f/${formId}`} className="underline hover:text-ink">Contact form</a> · <a href={`/f/${formId}/book`} className="underline hover:text-ink">Book a showing</a></p>
    </section>
  );
}
