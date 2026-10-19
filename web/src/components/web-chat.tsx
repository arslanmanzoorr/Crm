"use client";

import { Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookingForm, type Bookable } from "./booking-form";
import { input } from "./forms";

type Msg = { id: number; from: "visitor" | "ai" | "agent"; text: string };
type Mode = "off" | "answer" | "book";
type Res = { chat?: string; token?: string; mode?: Mode; human?: boolean; messages?: Msg[]; note?: string; error?: string;
  booking?: { team: string; tz: string | null; listings: Bookable[]; initial: string } };

const GREETING: Record<Mode, string> = {
  answer: "Hi! Ask me about our homes for sale or rent, or how buying and selling works.",
  book: "Hi! Ask me about our homes for sale or rent, or pick one to see and I'll find you a time.",
  off: "Hi! Send us a message and someone from the team will reply here.",
};
const POLL_MS = 4_000, IDLE_MS = 20 * 60_000;

/**
 * Public website chat. Saved for the team's Inbox; the AI answers when the team allows it, and a person can take
 * over at any time (this page then polls for their replies). The chat survives a reload in this tab only.
 */
export function WebChat({ formId, mode: initialMode }: { formId: string; mode: Mode }) {
  const store = `chat:${formId}:session`;
  const [session, setSession] = useState<{ id: string; token: string } | null>(null);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [human, setHuman] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [booking, setBooking] = useState<Res["booking"] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const lastActive = useRef(0); // set on each send or resume
  const end = useRef<HTMLDivElement>(null);

  const post = useCallback(async (b: object): Promise<Res> => {
    const r = await fetch(`/api/chat/${formId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
    const j = (await r.json().catch(() => ({}))) as Res;
    if (!r.ok) throw new Error(j.error ?? "Chat is busy right now.");
    return j;
  }, [formId]);
  // Messages come back newest-last with ids; merge without duplicates.
  const merge = (add: Msg[] = []) => setMsgs((m) => { const seen = new Set(m.map((x) => x.id)); return [...m, ...add.filter((x) => !seen.has(x.id))]; });
  const apply = (j: Res) => {
    if (j.mode) setMode(j.mode);
    if (typeof j.human === "boolean") setHuman(j.human);
    merge(j.messages);
  };

  // Resume this tab's chat after a reload.
  useEffect(() => {
    let saved: { id: string; token: string } | null = null;
    try { saved = JSON.parse(sessionStorage.getItem(store) ?? "null"); } catch {}
    if (!saved) return;
    const s = saved;
    lastActive.current = Date.now();
    post({ action: "read", chat: s.id, token: s.token, after: 0 }).then((j) => { setSession(s); apply(j); }).catch(() => { try { sessionStorage.removeItem(store); } catch {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post, store]);

  // While a person (or nobody but people) is on the chat, look for their replies.
  const lastId = msgs.at(-1)?.id ?? 0;
  useEffect(() => {
    if (!session || !(human || mode === "off")) return;
    const t = setInterval(() => {
      if (document.hidden || Date.now() - lastActive.current > IDLE_MS) return;
      post({ action: "read", chat: session.id, token: session.token, after: lastId }).then(apply).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, human, mode, lastId, post]);

  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [msgs.length, busy, booking]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    lastActive.current = Date.now();
    setBusy(true); setErr(null); setNote(null);
    try {
      const j = await post({ action: "say", chat: session?.id, token: session?.token, text: q.slice(0, 600) });
      setText("");
      if (!session && j.chat && j.token) {
        const s = { id: j.chat, token: j.token };
        setSession(s);
        try { sessionStorage.setItem(store, JSON.stringify(s)); } catch {}
      }
      apply(j);
      setNote(j.note ?? null);
      if (j.booking) setBooking(j.booking);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const askPerson = async () => {
    if (!session) return;
    lastActive.current = Date.now();
    try { await post({ action: "person", chat: session.id, token: session.token }); setHuman(true); setNote(null); }
    catch (e) { setErr((e as Error).message); }
  };

  // The contact form picks this up, so nobody has to repeat themselves.
  const carry = () => { try { sessionStorage.setItem(`chat:${formId}`, `From the website chat: ${msgs.filter((m) => m.from === "visitor").map((m) => m.text).join(" / ")}`.slice(0, 1900)); } catch {} };
  const label = { visitor: "You", ai: "Assistant", agent: "Team" } as const;
  return (
    <section aria-labelledby="chat-title" className="flex flex-col gap-4 rounded-card bg-surface-2 p-6">
      <h1 id="chat-title" className="text-2xl font-light">{mode === "off" ? "Message us" : "Ask a question"}</h1>
      <div role="log" aria-live="polite" className="flex max-h-[55dvh] flex-col gap-2 overflow-y-auto">
        <p className="max-w-[85%] self-start rounded-2xl bg-surface-3 px-4 py-2.5 text-sm">{GREETING[mode]}</p>
        {msgs.map((m) => (
          <p key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.from === "visitor" ? "self-end bg-accent text-on-light" : "self-start bg-surface-3"}`}>
            {m.from === "agent" ? <span className="mb-0.5 block text-xs font-medium text-accent-ink">Team</span> : <span className="sr-only">{label[m.from]}: </span>}
            {m.text}
          </p>
        ))}
        {busy && <p className="self-start rounded-2xl bg-surface-3 px-4 py-2.5 text-sm text-muted">{human || mode === "off" ? "Sending…" : "Typing…"}</p>}
        {human && mode !== "off" && <p className="self-center text-center text-xs text-muted">A person from the team has this chat. They&apos;ll reply here if they&apos;re available; if you&apos;d rather not wait, use the <a href={`/f/${formId}?source=Website+chat`} onClick={carry} className="underline hover:text-ink">contact form</a>.</p>}
        <div ref={end} />
      </div>
      {booking && session && (
        <BookingForm formId={formId} team={booking.team} tz={booking.tz} listings={booking.listings} initial={booking.initial} chat={session} />
      )}
      {note && <p role="status" className="text-sm text-muted">{note}</p>}
      {err && <p role="alert" className="text-sm text-score-1">{err}</p>}
      <form onSubmit={send} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={600} placeholder={mode === "off" || human ? "Type your message" : "Type your question"} aria-label="Your message" className={`${input} flex-1`} />
        <button disabled={busy || !text.trim()} aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-on-light disabled:opacity-60"><Send aria-hidden className="size-4" /></button>
      </form>
      {session && !human && mode !== "off" && (
        <button type="button" onClick={askPerson} className="flex min-h-11 items-center justify-center rounded-full bg-surface-3 px-4 text-sm hover:bg-surface-1">Talk to a person</button>
      )}
      <p className="text-xs text-muted">
        {mode === "off" ? "Messages go to the team. " : "Automated answers from listing details; a person from the team can join at any time. "}
        Chats are saved so the team can follow up. Don&apos;t share personal details here. <a href={`/f/${formId}?source=Website+chat`} onClick={carry} className="underline hover:text-ink">Contact form</a> · <a href={`/f/${formId}/book`} className="underline hover:text-ink">Book a showing</a>
      </p>
    </section>
  );
}
