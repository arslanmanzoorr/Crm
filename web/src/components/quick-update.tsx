"use client";

import { CalendarClock, Flag, MessageSquareText, PhoneCall, StickyNote, Wand2 } from "lucide-react";
import { useState, useTransition } from "react";
import { applyQuickUpdate, parseQuickUpdate } from "@/lib/actions";
import { STAGES } from "@/lib/data";
import type { QuickAction } from "@/lib/quick";
import { Dictate } from "./dictate";

type Row = QuickAction & { on: boolean };
const ICON = { log: PhoneCall, note: StickyNote, task: CalendarClock, stage: Flag } as const;
const field = "min-h-10 rounded-xl bg-surface-3 px-2";

/** Say or type what happened after a call or showing; AI proposes the updates, the agent checks and saves them.
 *  Nothing is ever sent to the client from here. */
export function QuickUpdate({ leadId, first }: { leadId: string; first: string }) {
  const [said, setSaid] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (n: number, patch: Partial<Row>) => setRows((r) => r && r.map((x, i) => (i === n ? ({ ...x, ...patch } as Row) : x)));

  const parse = () => start(async () => {
    setMsg(null);
    const r = await parseQuickUpdate(leadId, said);
    if ("error" in r) { setMsg({ error: r.error }); return; }
    setRows(r.actions.map((a) => ({ ...a, on: true })));
  });
  const save = () => start(async () => {
    const r = await applyQuickUpdate(leadId, (rows ?? []).filter((x) => x.on).map(({ on: _on, ...a }) => a as QuickAction)); // eslint-disable-line @typescript-eslint/no-unused-vars
    setMsg(r ?? null);
    if (r?.ok) { setRows(null); setSaid(""); }
  });

  return (
    <section aria-labelledby="quick" className="rounded-card bg-surface-2 p-5 sm:p-6">
      <h2 id="quick" className="flex items-center gap-2 text-xl"><Wand2 aria-hidden className="size-5 text-accent-ink" /> Quick update</h2>
      <p className="mt-1 text-sm text-muted">Just talked to {first}? Say what happened. AI turns it into a logged call, a note, a follow-up or a stage change, and you check it before anything is saved.</p>
      <div className="mt-3 flex gap-2">
        <textarea value={said} onChange={(e) => setSaid(e.target.value)} maxLength={1000} rows={2} aria-label="Quick update: what happened"
          placeholder={`e.g. "Called ${first}, loved Oak Ave, wants a showing Saturday at 10. Follow up Friday."`}
          className="min-h-11 min-w-0 flex-1 resize-y rounded-2xl bg-surface-1 px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent" />
        <Dictate onText={(t) => setSaid((s) => (s ? `${s} ${t}` : t))} label="Speak what happened" />
      </div>
      <button type="button" onClick={parse} disabled={pending || said.trim().length < 3}
        className="mt-3 min-h-11 rounded-full bg-surface-light px-5 text-sm font-medium text-on-light hover:bg-white disabled:opacity-60">{pending && !rows ? "Thinking…" : "Turn into updates"}</button>

      {rows && (
        <div className="mt-4 flex flex-col gap-2">
          <ul className="flex flex-col gap-2">
            {rows.map((r, n) => {
              const Icon = r.type === "log" && r.channel !== "Call" ? MessageSquareText : ICON[r.type];
              const what = r.type === "log" ? `Log ${r.channel === "Call" ? "a call" : `a ${r.channel}`}` : r.type === "note" ? "Add a note" : r.type === "task" ? (r.kind === "showing" ? "Add a showing" : "Add a follow-up") : "Move stage";
              return (
                <li key={n} className={`flex items-start gap-3 rounded-2xl bg-surface-1 p-3 text-sm ${r.on ? "" : "opacity-60"}`}>
                  <input type="checkbox" checked={r.on} aria-label={what} onChange={(e) => set(n, { on: e.target.checked })} className="mt-2.5 size-5 accent-[var(--color-accent)]" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-medium"><Icon aria-hidden className="size-4 text-muted" /> {what}</p>
                    {r.type === "stage" ? (
                      <select value={r.stage} aria-label="Stage" onChange={(e) => set(n, { stage: e.target.value as typeof r.stage })} className={`${field} mt-1.5`}>
                        {STAGES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    ) : r.type === "task" ? (
                      <input value={r.text} aria-label={`${what}: title`} onChange={(e) => set(n, { text: e.target.value })} maxLength={120} className={`${field} mt-1.5 w-full`} />
                    ) : (
                      <textarea value={r.text} aria-label={`${what}: text`} onChange={(e) => set(n, { text: e.target.value })} maxLength={1000} rows={2} className={`${field} mt-1.5 w-full resize-y py-2`} />
                    )}
                    {r.type === "task" && (
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        <input type="date" value={r.date} aria-label="Follow-up date" onChange={(e) => set(n, { date: e.target.value })} className={field} />
                        <input type="time" value={r.time} aria-label="Follow-up time" onChange={(e) => set(n, { time: e.target.value })} className={field} />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={save} disabled={pending || !rows.some((r) => r.on)} className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-on-light hover:bg-accent-strong disabled:opacity-60">{pending ? "Saving…" : "Save updates"}</button>
            <button type="button" onClick={() => setRows(null)} className="min-h-11 rounded-full px-4 text-sm text-muted hover:text-ink">Discard</button>
          </div>
        </div>
      )}
      {msg?.error && <p role="alert" className="mt-3 text-sm text-score-1">{msg.error}</p>}
      {msg?.ok && <p role="status" className="mt-3 text-sm text-accent-ink">{msg.ok}.</p>}
    </section>
  );
}
