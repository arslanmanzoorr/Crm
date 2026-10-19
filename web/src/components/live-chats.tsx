"use client";

import { ArrowLeft, Bot, Hand, MessagesSquare, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { replyChat, setChatMode, takeOverChat } from "@/lib/actions";
import type { ChatMode as Mode, WebChatRow } from "@/lib/db";
import { LocalTime } from "./local-time";

const MODES: { key: Mode; label: string; hint: string }[] = [
  { key: "off", label: "People only", hint: "No automatic answers. Messages wait here for your team." },
  { key: "answer", label: "Assistant answers", hint: "Answers questions from your live listings only, never invents details." },
  { key: "book", label: "Assistant answers and books", hint: "Also opens the booking form in the chat when someone wants to see a home." },
];

/** Team setting for what the website chat's assistant does. Agents see it; owners and admins change it. */
export function ChatMode({ mode, admin }: { mode: Mode; admin: boolean }) {
  const [value, setValue] = useState(mode);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const pick = (m: Mode) => {
    const prev = value;
    setValue(m); setMsg(null);
    start(async () => { const r = await setChatMode(m); if (r?.error) setValue(prev); setMsg(r ?? null); });
  };
  return (
    <fieldset className="flex flex-col gap-2 rounded-card bg-surface-2 p-5" disabled={!admin || pending}>
      <legend className="float-left mb-2 font-medium">Website chat assistant</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {MODES.map((m) => (
          <label key={m.key} className="flex cursor-pointer flex-col gap-0.5 rounded-2xl bg-surface-3 p-3 text-sm has-[:checked]:bg-accent has-[:checked]:text-on-light has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent has-[:disabled]:cursor-default">
            <input type="radio" name="chat_ai" value={m.key} checked={value === m.key} onChange={() => pick(m.key)} className="sr-only" />
            <span className="font-medium">{m.label}</span>
            <span className="text-xs opacity-80">{m.hint}</span>
          </label>
        ))}
      </div>
      <p role="status" className={`text-xs ${msg?.error ? "text-score-1" : "text-muted"}`}>
        {msg?.error ?? msg?.ok ?? (admin ? "Every chat is saved here either way, and anyone on the team can take one over." : "An owner or admin can change this.")}
      </p>
    </fieldset>
  );
}

const who = { visitor: "Visitor", ai: "Assistant", agent: "Team" } as const;

/** Website chats with take over, hand back and reply. Refreshes every few seconds while the tab is open. */
export function LiveChats({ chats }: { chats: WebChatRow[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(chats[0]?.id ?? null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const end = useRef<HTMLLIElement>(null);
  const c = chats.find((x) => x.id === activeId) ?? chats[0];
  const count = c?.messages.length;

  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) router.refresh(); }, 5_000);
    return () => clearInterval(t);
  }, [router]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [activeId, count]);

  if (!c)
    return (
      <div className="flex flex-col items-start gap-3 rounded-card bg-surface-2 p-8">
        <MessagesSquare aria-hidden className="size-6 text-muted" />
        <p>No website chats yet. Share your chat link (Account, Lead forms) or link it from your website, and chats show up here as they happen.</p>
      </div>
    );

  const name = (x: WebChatRow) => x.contact?.name ?? "Website visitor";
  const run = (fn: () => Promise<{ ok?: string; error?: string } | undefined>, after?: () => void) => {
    setErr("");
    start(async () => { const r = await fn(); if (r?.error) setErr(r.error); else { after?.(); router.refresh(); } });
  };

  return (
    <div className="grid gap-4 lg:h-[70dvh] lg:grid-cols-[320px_1fr]">
      <nav aria-label="Website chats" className={`min-w-0 flex-col gap-2 lg:flex lg:overflow-y-auto ${open ? "hidden" : "flex"}`}>
        {chats.map((x) => {
          const sel = x.id === c.id, last = x.messages.at(-1);
          return (
            <button key={x.id} type="button" aria-current={sel ? "true" : undefined}
              onClick={() => { setActiveId(x.id); setOpen(true); setDraft(""); setErr(""); }}
              className={`flex min-h-16 flex-col gap-0.5 rounded-card p-3 text-left transition duration-150 ${sel ? "bg-surface-light text-on-light" : "bg-surface-2 hover:bg-surface-3"}`}>
              <span className="flex items-center justify-between gap-2 text-sm font-medium">
                <span className="truncate">{name(x)}</span>
                <span className={`shrink-0 text-xs font-normal ${sel ? "text-on-light/70" : "text-muted"}`}><LocalTime ts={x.lastAt} /></span>
              </span>
              <span className={`block truncate text-xs ${sel ? "text-on-light/70" : "text-muted"}`}>
                {x.wantsPerson ? <span className={`font-medium ${sel ? "text-on-light" : "text-score-2"}`}>Wants a person · </span>
                  : x.human ? <span className="font-medium">With the team · </span> : null}
                {last ? `${who[last.from]}: ${last.text}` : ""}
              </span>
            </button>
          );
        })}
      </nav>

      <section aria-label={`Chat with ${name(c)}`} className={`min-h-[60dvh] min-w-0 flex-col rounded-card bg-surface-2 p-4 lg:flex ${open ? "flex" : "hidden"}`}>
        <header className="flex flex-wrap items-center gap-3 border-b border-line/5 pb-3">
          <button type="button" onClick={() => setOpen(false)} aria-label="Back to chats" className="-ml-1 grid size-11 place-items-center rounded-full hover:bg-surface-3 lg:hidden">
            <ArrowLeft aria-hidden className="size-5" />
          </button>
          {c.contact ? <Link href={`/leads/${c.contact.id}`} className="flex min-h-11 min-w-0 flex-1 items-center truncate hover:text-accent-ink">{c.contact.name}</Link>
            : <span className="min-w-0 flex-1 truncate">Website visitor <span className="text-sm text-muted">· anonymous until they book</span></span>}
          {c.human ? (
            <button type="button" disabled={pending} onClick={() => run(() => takeOverChat(c.id, false))} className="flex min-h-11 items-center gap-2 rounded-full bg-surface-3 px-4 text-sm hover:text-accent-ink disabled:opacity-60">
              <Bot aria-hidden className="size-4" /> Hand back to assistant
            </button>
          ) : (
            <button type="button" disabled={pending} onClick={() => run(() => takeOverChat(c.id, true))} className="flex min-h-11 items-center gap-2 rounded-full bg-surface-light px-4 text-sm font-medium text-on-light hover:bg-white disabled:opacity-60">
              <Hand aria-hidden className="size-4" /> Take over
            </button>
          )}
        </header>

        <ol key={c.id} className="flex flex-1 flex-col gap-2 overflow-y-auto py-4">
          {c.messages.map((m) => (
            <li key={m.id} className={`max-w-[85%] rounded-3xl px-4 py-2 text-sm break-words whitespace-pre-wrap ${m.from === "visitor" ? "self-start bg-surface-3" : m.from === "agent" ? "self-end bg-accent text-on-light" : "self-end bg-surface-1"}`}>
              <span className={`mb-0.5 block text-[11px] font-medium ${m.from === "agent" ? "text-on-light/70" : "text-muted"}`}>{who[m.from]}</span>
              {m.text}
              <span className={`mt-0.5 block text-[11px] ${m.from === "agent" ? "text-on-light/70" : "text-muted"}`}><LocalTime ts={m.at} /></span>
            </li>
          ))}
          <li ref={end} aria-hidden />
        </ol>

        <form onSubmit={(e) => { e.preventDefault(); run(() => replyChat(c.id, draft), () => setDraft("")); }}
          className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] -mx-4 -mb-4 flex flex-col gap-2 rounded-b-card bg-surface-2 px-4 pt-2 pb-4 lg:static">
          {err && <p role="alert" className="text-sm text-score-1">{err}</p>}
          <div className="flex items-end gap-2">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={2000} aria-label="Reply"
              placeholder={c.human ? "Reply to the visitor" : "Replying takes this chat over from the assistant"}
              className="min-w-0 flex-1 resize-none rounded-3xl bg-surface-1 px-4 py-3 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent" />
            <button disabled={pending || !draft.trim()} aria-label="Send reply" className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-on-light hover:bg-accent-strong disabled:opacity-60">
              <Send aria-hidden className="size-4" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
