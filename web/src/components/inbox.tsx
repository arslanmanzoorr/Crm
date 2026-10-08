"use client";

import { Inbox as InboxIcon, Send, Sparkles, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar, Chip } from "@/components/ui";
import { logMessage } from "@/lib/actions";
import { askAi } from "@/lib/ai";
import type { Thread } from "@/lib/data";
import { LocalTime } from "./local-time";

/** Native app link that delivers the message from the agent's own phone or mail app. */
function deliverLink(t: Thread, text: string) {
  const body = encodeURIComponent(text);
  const digits = t.phone.replace(/[^\d]/g, "");
  if (t.channel === "SMS" && t.phone) return `sms:${t.phone}?&body=${body}`;
  if (t.channel === "WhatsApp" && digits) return `https://wa.me/${digits}?text=${body}`;
  if (t.channel === "Email" && t.email) return `mailto:${t.email}?body=${body}`;
  return null; // Instagram DMs have no deep link that pre-fills text
}

export function Inbox({ threads }: { threads: Thread[] }) {
  const [active, setActive] = useState(0);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  if (!threads.length)
    return (
      <div className="flex flex-col items-start gap-3 rounded-card bg-surface-2 p-8">
        <InboxIcon className="size-6 text-muted" />
        <p>No conversations yet. Log an SMS, WhatsApp, email or Instagram message on a lead&apos;s timeline and it shows up here.</p>
        <Link href="/leads" className="rounded-full bg-surface-light px-4 py-2 text-sm font-medium text-on-light">Go to leads</Link>
      </div>
    );

  const t = threads[Math.min(active, threads.length - 1)];

  async function aiDraft() {
    setBusy(true);
    setErr("");
    try {
      setDraft(await askAi("reply", { channel: t.channel, lead: { name: t.name, ...t.lead }, messages: t.messages.slice(-20) }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function record(direction: "in" | "out") {
    const text = draft.trim();
    if (!text) return;
    if (direction === "out") {
      const link = deliverLink(t, text);
      if (link) window.open(link, "_blank");
    }
    start(async () => {
      try {
        await logMessage(t.leadId, t.channel, text, direction);
        setDraft("");
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <div className="grid gap-4 lg:h-[calc(100vh-3rem)] lg:grid-cols-[320px_1fr]">
      <nav aria-label="Conversations" className="flex min-w-0 flex-col gap-2 overflow-y-auto">
        <h1 className="mb-2 text-xl">Inbox</h1>
        {threads.map((x, i) => (
          <button key={x.leadId + x.channel} type="button" onClick={() => { setActive(i); setDraft(""); setErr(""); }} aria-current={x === t}
            className={`flex items-center gap-3 rounded-card p-3 text-left transition ${x === t ? "bg-surface-light text-on-light" : "bg-surface-2 hover:bg-surface-3"}`}>
            <Avatar name={x.name} size={40} />
            <span className="min-w-0 flex-1">
              <span className="flex justify-between text-sm font-medium">{x.name}<span className="text-xs font-normal opacity-60">{x.channel}</span></span>
              <span className="block truncate text-xs opacity-60">{x.messages.at(-1)?.from === "lead" ? "● " : ""}{x.messages.at(-1)?.text}</span>
            </span>
          </button>
        ))}
      </nav>

      <section aria-label={`Conversation with ${t.name}`} className="flex min-h-[70vh] min-w-0 flex-col rounded-card bg-surface-2 p-4">
        <header className="flex items-center gap-3 border-b border-white/5 pb-3">
          <Avatar name={t.name} size={36} />
          <Link href={`/leads/${t.leadId}`} className="flex-1 hover:text-accent">{t.name}</Link>
          <Chip>{t.channel}</Chip>
        </header>
        <ol className="flex flex-1 flex-col gap-2 overflow-y-auto py-4">
          {t.messages.map((m, i) => (
            <li key={i} className={`max-w-[80%] rounded-3xl px-4 py-2 text-sm ${m.from === "agent" ? "self-end bg-accent text-on-light" : "self-start bg-surface-3"}`}>
              {m.text}
              <span className="block text-[10px] opacity-50"><LocalTime ts={m.at} /></span>
            </li>
          ))}
        </ol>
        {err && <p role="alert" className="pb-2 text-sm text-score-1">{err}</p>}
        <div className="flex flex-wrap items-end gap-2">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder={`Message ${t.name.split(" ")[0]}, or paste their reply…`} aria-label="Message"
            className="min-w-0 flex-1 resize-none rounded-3xl bg-surface-1 px-4 py-3 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent" />
          <button type="button" onClick={aiDraft} disabled={busy} title="Draft reply with AI" className="flex items-center gap-2 rounded-full bg-surface-light px-4 py-3 text-sm font-medium text-on-light hover:bg-white disabled:opacity-60">
            <Sparkles className="size-4" /> {busy ? "…" : "AI draft"}
          </button>
          <button type="button" onClick={() => record("in")} disabled={pending} title="Log as their reply" aria-label="Log as their reply" className="grid size-11 place-items-center rounded-full bg-surface-3 hover:text-accent">
            <Undo2 className="size-4" />
          </button>
          <button type="button" onClick={() => record("out")} disabled={pending} title={deliverLink(t, "x") ? `Send via ${t.channel} and log it` : "Log as sent"} aria-label="Send" className="grid size-11 place-items-center rounded-full bg-accent text-on-light hover:bg-accent-strong">
            <Send className="size-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
