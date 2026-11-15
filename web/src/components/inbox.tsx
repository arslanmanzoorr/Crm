"use client";

import { ArrowLeft, ArrowUpRight, Inbox as InboxIcon, MessageSquareReply, MessagesSquare, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui";
import { logMessage } from "@/lib/actions";
import { askAi } from "@/lib/ai";
import type { Thread } from "@/lib/data";
import { useNow } from "./header";
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

const keyOf = (t: Thread) => t.leadId + t.channel;
const waiting = (t: Thread) => t.messages.at(-1)?.from === "lead";

/** "5m", "3h", "16d": time since an ISO timestamp; null for mock labels or before the clock is known. */
function since(iso: string | undefined, now: Date | null) {
  if (!iso || !now || isNaN(Date.parse(iso))) return null;
  const m = Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / 60_000));
  return m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
}

/** Day heading for a run of messages: "Today", "Yesterday" or "Oct 29". */
function dayLabel(iso: string, now: Date | null) {
  const d = new Date(iso);
  if (isNaN(d.getTime()) || !now) return null;
  const days = Math.round((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Inbox({ threads }: { threads: Thread[] }) {
  const now = useNow();
  // Whoever is waiting on the agent comes first, longest wait at the top; then everything else, newest first.
  const sorted = [...threads].sort((a, b) => {
    const wa = waiting(a), wb = waiting(b);
    if (wa !== wb) return wa ? -1 : 1;
    const la = a.messages.at(-1)?.at ?? "", lb = b.messages.at(-1)?.at ?? "";
    return wa ? la.localeCompare(lb) : lb.localeCompare(la);
  });
  const needs = sorted.filter(waiting).length;
  const [filter, setFilter] = useState<"all" | "needs">("all");
  const list = filter === "needs" ? sorted.filter(waiting) : sorted;
  const [activeKey, setActiveKey] = useState(() => (sorted[0] ? keyOf(sorted[0]) : ""));
  const [open, setOpen] = useState(false); // phones: list or conversation, never both
  const [draft, setDraft] = useState("");
  const [aiWritten, setAiWritten] = useState(false); // the box holds an AI draft: say so until it is sent or cleared
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const end = useRef<HTMLLIElement>(null);
  const t = sorted.find((x) => keyOf(x) === activeKey) ?? sorted[0];
  const count = t?.messages.length;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [activeKey, count]);

  if (!t)
    return (
      <div className="flex flex-col items-start gap-3 rounded-card bg-surface-2 p-8">
        <InboxIcon aria-hidden className="size-6 text-muted" />
        <p>No conversations yet. Log an SMS, WhatsApp, email or Instagram message on a lead&apos;s timeline and it shows up here.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/leads" className="flex min-h-11 items-center rounded-full bg-surface-light px-4 text-sm font-medium text-on-light">Go to leads</Link>
          <Link href="/inbox/chats" className="flex min-h-11 items-center rounded-full bg-surface-3 px-4 text-sm">Website chats</Link>
        </div>
      </div>
    );

  async function aiDraft() {
    setBusy(true);
    setErr("");
    try {
      setAiWritten(true);
      setDraft(await askAi("reply", { channel: t.channel, lead: { name: t.name, ...t.lead }, matchingListings: t.homes ?? [], messages: t.messages.slice(-20) }));
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
        setAiWritten(false);
      } catch {
        setErr("Couldn't save the message. Your text is still here; try again.");
      }
    });
  }

  const sendVia = deliverLink(t, "x") ? `Send via ${t.channel}` : "Log as sent";
  const first = t.name.split(" ")[0];
  const isWaiting = waiting(t);
  const wait = isWaiting ? since(t.messages.at(-1)?.at, now) : null;
  const about = [t.lead?.budget, t.lead?.areas?.join(", ")].filter(Boolean).join(" · ");
  // Before anything is written, the AI draft is the next move; once there's text, sending is.
  const lead = "flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-on-light transition duration-150 hover:bg-accent-strong disabled:opacity-60";
  const quiet = "flex min-h-11 items-center gap-2 rounded-full bg-surface-3 px-4 text-sm transition duration-150 hover:bg-surface-light hover:text-on-light disabled:opacity-60";

  return (
    <div className="grid gap-4 lg:h-[calc(100dvh-4rem)] lg:grid-cols-[340px_1fr]">
      <nav data-tour="inbox" aria-label="Conversations" className={`min-w-0 flex-col gap-3 lg:flex lg:min-h-0 ${open ? "hidden" : "flex"}`}>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-4xl font-light">Inbox</h1>
          <Link href="/inbox/chats" className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-4 text-sm hover:bg-surface-3"><MessagesSquare aria-hidden className="size-4 text-muted" /> Website chats</Link>
        </div>
        <div role="group" aria-label="Show" className="flex gap-2">
          {([["all", "All", sorted.length], ["needs", "Needs reply", needs]] as const).map(([v, l, n]) => (
            <button key={v} type="button" aria-pressed={filter === v} onClick={() => setFilter(v)}
              className={`flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm transition duration-150 ${filter === v ? "bg-surface-light text-on-light" : "bg-surface-2 text-ink/80 hover:text-accent-ink"}`}>
              {v === "needs" && n > 0 && <span aria-hidden className="size-1.5 rounded-full bg-accent" />}{l} <span className="text-xs opacity-70">{n}</span>
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="rounded-card bg-surface-2 p-5 text-sm text-muted">Nobody is waiting on you. Nice.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line/5 overflow-hidden rounded-card bg-surface-2 lg:min-h-0 lg:overflow-y-auto">
            {list.map((x) => {
              const sel = keyOf(x) === keyOf(t);
              const last = x.messages.at(-1);
              const w = waiting(x);
              const ago = since(last?.at, now);
              return (
                <li key={keyOf(x)}>
                  <button
                    type="button"
                    onClick={() => { setActiveKey(keyOf(x)); setOpen(true); setDraft(""); setAiWritten(false); setErr(""); }}
                    aria-current={sel ? "true" : undefined}
                    className={`relative flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ${sel ? "lg:bg-surface-3" : ""} hover:bg-surface-3/60`}
                  >
                    {sel && <span aria-hidden className="absolute inset-y-2 left-0 hidden w-1 rounded-r-full bg-accent lg:block" />}
                    <Avatar name={x.name} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-sm ${w ? "font-semibold" : "font-medium"}`}>{x.name}</span>
                        <span className="shrink-0 text-xs text-muted tabular-nums">{x.channel}{ago && ` · ${ago}`}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={`min-w-0 flex-1 truncate text-sm ${w ? "text-ink" : "text-muted"}`}>{last?.from === "agent" && "You: "}{last?.text}</span>
                        {w && <span role="img" aria-label="Waiting for your reply" className="size-2 shrink-0 rounded-full bg-accent" />}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <section aria-label={`Conversation with ${t.name}`} className={`h-[calc(100dvh-11rem-env(safe-area-inset-bottom))] min-w-0 flex-col overflow-hidden rounded-card bg-surface-2 md:h-[calc(100dvh-6rem)] lg:flex lg:h-auto lg:min-h-0 ${open ? "flex" : "hidden"}`}>
        <header className="flex items-center gap-3 border-b border-line/5 px-4 py-3 sm:px-5">
          <button type="button" onClick={() => setOpen(false)} aria-label="Back to conversations" className="-ml-1 grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-3 lg:hidden">
            <ArrowLeft aria-hidden className="size-5" />
          </button>
          <Avatar name={t.name} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{t.name} <span className="font-normal text-muted">· {t.channel}</span></p>
            <p className="truncate text-sm text-muted">{t.lead?.intent && t.lead.intent !== "Not analyzed yet" ? t.lead.intent : about || "No profile yet"}</p>
          </div>
          <Link href={`/leads/${t.leadId}`} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm text-muted hover:bg-surface-3 hover:text-ink">
            <span className="hidden sm:inline">Open lead</span><ArrowUpRight aria-hidden className="size-4" /><span className="sr-only sm:hidden">Open {t.name}</span>
          </Link>
        </header>

        <ol key={keyOf(t)} className="flex min-h-0 flex-1 animate-rise flex-col gap-2 overflow-y-auto px-4 py-4 sm:px-5">
          {t.messages.map((m, i) => {
            const day = dayLabel(m.at, now);
            const prev = i > 0 ? dayLabel(t.messages[i - 1].at, now) : null;
            return (
              <li key={i} className={`flex flex-col ${m.from === "agent" ? "items-end" : "items-start"}`}>
                {day && day !== prev && <span className="my-2 self-center rounded-full bg-surface-1 px-3 py-1 text-xs text-muted">{day}</span>}
                <span className={`max-w-[85%] rounded-3xl px-4 py-2 text-sm break-words ${m.from === "agent" ? "rounded-br-lg bg-accent text-on-light" : "rounded-bl-lg bg-surface-3"}`}>
                  {m.text}
                  <span className={`mt-0.5 block text-[11px] ${m.from === "agent" ? "text-on-light/70" : "text-muted"}`}><LocalTime ts={m.at} opts={{ hour: "numeric", minute: "2-digit" }} /></span>
                </span>
              </li>
            );
          })}
          <li ref={end} aria-hidden />
        </ol>

        <div className="flex shrink-0 flex-col gap-2 border-t border-line/5 bg-surface-2 px-4 pt-3 pb-4 sm:px-5">
          {err && <p role="alert" className="text-sm text-score-1">{err}</p>}
          {isWaiting && !draft && <p className="text-sm"><span className="text-accent-ink">{first} is waiting for your reply</span>{wait && <span className="text-muted"> · {wait}</span>}</p>}
          {aiWritten && draft && <p className="text-xs text-muted"><span className="font-medium text-accent-ink">AI draft</span> · read and edit it before you send</p>}
          <textarea
            value={draft}
            onChange={(e) => { setDraft(e.target.value); if (!e.target.value) setAiWritten(false); }}
            rows={2}
            placeholder={`Write to ${first}, or paste their reply`}
            aria-label="Message"
            className="min-w-0 resize-none rounded-3xl bg-surface-1 px-4 py-3 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" data-tour="ai-draft" onClick={aiDraft} disabled={busy} className={draft.trim() ? quiet : lead}>
              <Sparkles aria-hidden className={`size-4 ${busy ? "animate-pulse" : ""}`} /> {busy ? "Drafting…" : draft.trim() ? "Redraft" : "AI draft"}
            </button>
            <button type="button" onClick={() => record("in")} disabled={pending || !draft.trim()} className={quiet}>
              <MessageSquareReply aria-hidden className="size-4" /> Log their reply
            </button>
            <button type="button" onClick={() => record("out")} disabled={pending || !draft.trim()} className={`ml-auto ${draft.trim() ? lead : quiet}`}>
              <Send aria-hidden className="size-4" /> {sendVia}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
