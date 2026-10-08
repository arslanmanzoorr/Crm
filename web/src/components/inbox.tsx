"use client";

import { ArrowLeft, Inbox as InboxIcon, MessageSquareReply, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
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
  const [open, setOpen] = useState(false); // phones: list or conversation, never both
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const end = useRef<HTMLLIElement>(null);
  const t = threads[Math.min(active, threads.length - 1)];
  const count = t?.messages.length;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [active, count]);

  if (!threads.length)
    return (
      <div className="flex flex-col items-start gap-3 rounded-card bg-surface-2 p-8">
        <InboxIcon aria-hidden className="size-6 text-muted" />
        <p>No conversations yet. Log an SMS, WhatsApp, email or Instagram message on a lead&apos;s timeline and it shows up here.</p>
        <Link href="/leads" className="flex min-h-11 items-center rounded-full bg-surface-light px-4 text-sm font-medium text-on-light">Go to leads</Link>
      </div>
    );

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
      if (link) window.open(link, "_blank", "noopener");
    }
    setErr("");
    start(async () => {
      try {
        await logMessage(t.leadId, t.channel, text, direction);
        setDraft("");
      } catch {
        setErr("Couldn't save the message. Your text is still here; try again.");
      }
    });
  }

  const sendVia = deliverLink(t, "x") ? `Send via ${t.channel}` : "Log as sent";

  return (
    <div className="grid gap-4 lg:h-[calc(100dvh-4rem)] lg:grid-cols-[320px_1fr]">
      <nav aria-label="Conversations" className={`min-w-0 flex-col gap-2 lg:flex lg:overflow-y-auto ${open ? "hidden" : "flex"}`}>
        <h1 className="mb-2 text-4xl font-light">Inbox</h1>
        {threads.map((x, i) => {
          const sel = x === t;
          const last = x.messages.at(-1);
          return (
            <button
              key={x.leadId + x.channel}
              type="button"
              onClick={() => { setActive(i); setOpen(true); setDraft(""); setErr(""); }}
              aria-current={sel ? "true" : undefined}
              className={`flex min-h-16 items-center gap-3 rounded-card p-3 text-left transition duration-150 ${sel ? "bg-surface-light text-on-light" : "bg-surface-2 hover:bg-surface-3"}`}
            >
              <Avatar name={x.name} size={40} />
              <span className="min-w-0 flex-1">
                <span className="flex justify-between gap-2 text-sm font-medium">
                  {x.name}
                  <span className={`text-xs font-normal ${sel ? "text-on-light/70" : "text-muted"}`}>{x.channel}</span>
                </span>
                <span className={`block truncate text-xs ${sel ? "text-on-light/70" : "text-muted"}`}>
                  {last?.from === "lead" && <span className="font-medium text-score-2">Awaiting reply · </span>}
                  {last?.text}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <section aria-label={`Conversation with ${t.name}`} className={`min-h-[70dvh] min-w-0 flex-col rounded-card bg-surface-2 p-4 lg:flex ${open ? "flex" : "hidden"}`}>
        <header className="flex items-center gap-3 border-b border-white/5 pb-3">
          <button type="button" onClick={() => setOpen(false)} aria-label="Back to conversations" className="-ml-1 grid size-11 place-items-center rounded-full hover:bg-surface-3 lg:hidden">
            <ArrowLeft aria-hidden className="size-5" />
          </button>
          <Avatar name={t.name} size={36} />
          <Link href={`/leads/${t.leadId}`} className="flex min-h-11 min-w-0 flex-1 items-center truncate hover:text-accent">{t.name}</Link>
          <Chip>{t.channel}</Chip>
        </header>

        <ol key={t.leadId + t.channel} className="flex flex-1 animate-rise flex-col gap-2 overflow-y-auto py-4">
          {t.messages.map((m, i) => (
            <li key={i} className={`max-w-[85%] rounded-3xl px-4 py-2 text-sm break-words ${m.from === "agent" ? "self-end bg-accent text-on-light" : "self-start bg-surface-3"}`}>
              {m.text}
              <span className={`mt-0.5 block text-[11px] ${m.from === "agent" ? "text-on-light/70" : "text-muted"}`}><LocalTime ts={m.at} /></span>
            </li>
          ))}
          <li ref={end} aria-hidden />
        </ol>

        <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] -mx-4 -mb-4 flex flex-col gap-2 rounded-b-card bg-surface-2 px-4 pt-2 pb-4 lg:static">
          {err && <p role="alert" className="text-sm text-score-1">{err}</p>}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder={`Write to ${t.name.split(" ")[0]}, or paste their reply`}
            aria-label="Message"
            className="min-w-0 resize-none rounded-3xl bg-surface-1 px-4 py-3 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={aiDraft} disabled={busy} className="flex min-h-11 items-center gap-2 rounded-full bg-surface-light px-4 text-sm font-medium text-on-light hover:bg-white disabled:opacity-60">
              <Sparkles aria-hidden className={`size-4 ${busy ? "animate-pulse" : ""}`} /> {busy ? "Drafting…" : "AI draft"}
            </button>
            <button type="button" onClick={() => record("in")} disabled={pending || !draft.trim()} className="flex min-h-11 items-center gap-2 rounded-full bg-surface-3 px-4 text-sm hover:text-accent disabled:opacity-60">
              <MessageSquareReply aria-hidden className="size-4" /> Log their reply
            </button>
            <button type="button" onClick={() => record("out")} disabled={pending || !draft.trim()} className="ml-auto flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-on-light hover:bg-accent-strong disabled:opacity-60">
              <Send aria-hidden className="size-4" /> {sendVia}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
