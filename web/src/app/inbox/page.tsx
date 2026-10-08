"use client";

import { Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { Avatar, Chip } from "@/components/ui";
import { askAi } from "@/lib/ai";
import { leadById, threads as seed } from "@/lib/data";

export default function InboxPage() {
  // shortcut: sent messages live in component state only, until Supabase + Twilio/Gmail are wired.
  const [threads, setThreads] = useState(seed);
  const [active, setActive] = useState(0);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const t = threads[active];
  const lead = leadById(t.leadId)!;

  async function aiDraft() {
    setBusy(true);
    setErr("");
    try {
      setDraft(await askAi("reply", { channel: t.channel, lead: { name: lead.name, intent: lead.intent, budget: lead.budget, wants: lead.preferences }, messages: t.messages }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function send() {
    if (!draft.trim()) return;
    const msg = { from: "agent" as const, text: draft.trim(), at: "now" };
    setThreads(threads.map((x, i) => (i === active ? { ...x, messages: [...x.messages, msg] } : x)));
    setDraft("");
  }

  return (
    <div className="grid gap-4 lg:h-[calc(100vh-3rem)] lg:grid-cols-[320px_1fr]">
      <nav aria-label="Conversations" className="flex min-w-0 flex-col gap-2 overflow-y-auto">
        <h1 className="mb-2 text-xl">Inbox</h1>
        {threads.map((x, i) => {
          const l = leadById(x.leadId)!;
          return (
            <button
              key={x.leadId}
              type="button"
              onClick={() => { setActive(i); setDraft(""); setErr(""); }}
              aria-current={i === active}
              className={`flex items-center gap-3 rounded-card p-3 text-left transition ${i === active ? "bg-surface-light text-on-light" : "bg-surface-2 hover:bg-surface-3"}`}
            >
              <Avatar name={l.name} size={40} />
              <span className="min-w-0 flex-1">
                <span className="flex justify-between text-sm font-medium">{l.name}<span className="text-xs font-normal opacity-60">{x.channel}</span></span>
                <span className="block truncate text-xs opacity-60">{x.messages.at(-1)?.text}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <section aria-label={`Conversation with ${lead.name}`} className="flex min-h-[70vh] min-w-0 flex-col rounded-card bg-surface-2 p-4">
        <header className="flex items-center gap-3 border-b border-white/5 pb-3">
          <Avatar name={lead.name} size={36} />
          <span className="flex-1">{lead.name}</span>
          <Chip>{t.channel}</Chip>
        </header>

        <ol className="flex flex-1 flex-col gap-2 overflow-y-auto py-4">
          {t.messages.map((m, i) => (
            <li
              key={i}
              className={`max-w-[80%] rounded-3xl px-4 py-2 text-sm ${m.from === "agent" ? "self-end bg-accent text-on-light" : "self-start bg-surface-3"}`}
            >
              {m.text}
              <span className="block text-[10px] opacity-50">{m.at}</span>
            </li>
          ))}
        </ol>

        {err && <p role="alert" className="pb-2 text-sm text-score-1">{err}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder={`Message ${lead.name.split(" ")[0]}…`}
            aria-label="Message"
            className="min-w-0 flex-1 resize-none rounded-3xl bg-surface-1 px-4 py-3 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
          />
          <button type="button" onClick={aiDraft} disabled={busy} title="Draft reply with AI" className="flex items-center gap-2 rounded-full bg-surface-light px-4 py-3 text-sm font-medium text-on-light hover:bg-white disabled:opacity-60">
            <Sparkles className="size-4" /> {busy ? "…" : "AI draft"}
          </button>
          <button type="button" onClick={send} aria-label="Send" className="grid size-11 place-items-center rounded-full bg-accent text-on-light hover:bg-accent-strong">
            <Send className="size-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
