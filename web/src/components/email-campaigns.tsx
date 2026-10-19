"use client";

import { Eye, FlaskConical, LineChart, Mail, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { audienceCount, cancelCampaign, createCampaign, deleteCampaign, previewCampaign, saveCampaign, saveSender, sendCampaign, sendCampaignTest, type FormState } from "@/lib/actions";
import { STAGES } from "@/lib/data";
import type { CampaignRow, Sender } from "@/lib/db";
import { input, primaryBtn } from "./form-classes";
import { ActionForm, Field } from "./forms";

const Note = ({ msg }: { msg: FormState | null }) => (msg?.error ? <p role="alert" className="text-sm text-score-1">{msg.error}</p> : msg?.ok ? <p role="status" className="text-sm text-accent-ink">{msg.ok}</p> : null);
const ghost = "flex min-h-11 items-center gap-2 rounded-full bg-surface-3 px-4 text-sm font-medium hover:bg-surface-light hover:text-on-light disabled:opacity-60";

export function NewCampaign() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<FormState | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} onClick={() => start(async () => setMsg((await createCampaign("market")) ?? null))} className={`${primaryBtn} flex items-center gap-2`}>
        <LineChart aria-hidden className="size-4" /> Monthly market update
      </button>
      <button type="button" disabled={pending} onClick={() => start(async () => setMsg((await createCampaign("blank")) ?? null))} className={ghost}>
        <Mail aria-hidden className="size-4" /> Blank email
      </button>
      <Note msg={msg} />
    </div>
  );
}

export function SenderSettings({ s, missing }: { s: Sender; missing: string[] }) {
  return (
    <div className="flex flex-col gap-4 rounded-card bg-surface-2 p-5">
      <ActionForm action={saveSender}>
        {(pending) => (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="From name" name="from_name" defaultValue={s.fromName || s.team} required maxLength={80} placeholder="e.g. Maya at Harbor & Pine" />
              <Field label="From address" name="from_address" type="email" defaultValue={s.fromAddress} required maxLength={200} placeholder="news@yourteam.com" hint="On a domain you've verified in Resend" />
              <Field label="Replies go to (optional)" name="reply_to" type="email" defaultValue={s.replyTo} maxLength={200} placeholder="maya@yourteam.com" />
              <Field label="Postal address" name="postal" defaultValue={s.postal} required maxLength={300} placeholder="Street, city, state ZIP" hint="Required by US law in every marketing email" />
            </div>
            <button disabled={pending} className={`${primaryBtn} w-fit`}>{pending ? "Saving…" : "Save sender"}</button>
          </>
        )}
      </ActionForm>
      {missing.length > 0 && <p className="text-sm text-muted">Sending switches on when the server has {missing.join(", ")}. You can write and preview campaigns now.</p>}
    </div>
  );
}

type Aud = { types: string[]; stages: string[]; tags: string[]; pastClients: boolean };
const TYPES = [["buyer", "Buyers"], ["seller", "Sellers"], ["investor", "Investors"], ["renter", "Renters"]] as const;

function Chips({ label, options, value, onChange }: { label: string; options: readonly (readonly [string, string])[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm text-muted">{label} <span className="text-xs">(none picked = everyone)</span></legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, l]) => {
          const on = value.includes(v);
          return <button key={v} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== v) : [...value, v])}
            className={`min-h-10 rounded-full px-3.5 text-sm ${on ? "bg-accent font-medium text-on-light" : "bg-surface-1 hover:bg-surface-3"}`}>{l}</button>;
        })}
      </div>
    </fieldset>
  );
}

/** Write, pick who gets it, preview, test, then send or schedule. Sent campaigns are read-only. */
export function CampaignEditor({ c, sender }: { c: CampaignRow; sender: boolean }) {
  const editable = c.status === "draft" || c.status === "cancelled";
  const [f, setF] = useState({ name: c.name, subject: c.subject, preheader: c.preheader, body: c.body, repeatMonthly: c.repeatMonthly });
  const a0 = c.audience as Partial<Aud>;
  const [aud, setAud] = useState<Aud>({ types: a0.types ?? [], stages: a0.stages ?? [], tags: a0.tags ?? [], pastClients: a0.pastClients ?? false });
  const [tagText, setTagText] = useState((a0.tags ?? []).join(", "));
  const [count, setCount] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [at, setAt] = useState("");
  const [msg, setMsg] = useState<FormState | null>(null);
  const [pending, start] = useTransition();
  const audKey = useMemo(() => JSON.stringify(aud), [aud]);

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => { void audienceCount(JSON.parse(audKey)).then((n) => { if (live) setCount(n); }); }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [audKey]);

  const save = async () => { const r = await saveCampaign(c.id, { ...f, audience: aud }); setMsg(r ?? null); return r; };
  const act = (fn: () => Promise<FormState>) => start(async () => { const s = editable ? await save() : { ok: "" }; if (s?.error) return; setMsg((await fn()) ?? null); });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="flex flex-col gap-5">
        <fieldset disabled={!editable} className="flex flex-col gap-3 rounded-card bg-surface-2 p-5">
          <legend className="sr-only">Email</legend>
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Campaign name (only you see this)</span>
            <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={120} className={input} /></label>
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Subject</span>
            <input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} maxLength={200} placeholder="e.g. {{first_name}}, your October market update" className={input} /></label>
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Preview line (shown after the subject in the inbox)</span>
            <input value={f.preheader} onChange={(e) => setF({ ...f, preheader: e.target.value })} maxLength={200} className={input} /></label>
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Message</span>
            <textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={20000} rows={14} className={`${input} resize-y py-3 font-[inherit] leading-relaxed`} /></label>
          <p className="text-xs text-muted">Blank line = new paragraph · <code># Heading</code> · <code>- bullet</code> · <code>**bold**</code> · <code>[link text](https://…)</code> · <code>{"{{first_name}}"}</code>. Your logo, address and an unsubscribe link are added automatically.</p>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={f.repeatMonthly} onChange={(e) => setF({ ...f, repeatMonthly: e.target.checked })} className="size-5 accent-[var(--color-accent)]" />
            Repeat monthly <span className="text-muted">(after sending, next month&apos;s draft and a reminder task are created; you review and send each one)</span></label>
        </fieldset>

        <fieldset disabled={!editable} className="flex flex-col gap-4 rounded-card bg-surface-2 p-5">
          <legend className="sr-only">Audience</legend>
          <h2 className="text-lg">Who gets it</h2>
          <Chips label="Lead types" options={TYPES} value={aud.types} onChange={(types) => setAud({ ...aud, types })} />
          <Chips label="Stages" options={STAGES.map((s) => [s, s] as const)} value={aud.stages} onChange={(stages) => setAud({ ...aud, stages })} />
          <label className="flex flex-col gap-1.5 text-sm"><span className="text-muted">Tags (comma separated, any of them)</span>
            <input value={tagText} onChange={(e) => { setTagText(e.target.value); setAud({ ...aud, tags: e.target.value.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) }); }} placeholder="e.g. westside, first-time" className={input} /></label>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={aud.pastClients} onChange={(e) => setAud({ ...aud, pastClients: e.target.checked })} className="size-5 accent-[var(--color-accent)]" /> Past clients only</label>
          <p className="text-sm" aria-live="polite"><span className="text-2xl font-light tabular-nums">{count ?? "…"}</span> <span className="text-muted">{count === 1 ? "person" : "people"} will get this. Only leads who agreed to email and haven&apos;t unsubscribed are ever included.</span></p>
        </fieldset>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <div className="flex flex-col gap-3 rounded-card bg-surface-2 p-5">
          <div className="flex flex-wrap gap-2">
            {editable && <button type="button" disabled={pending} onClick={() => start(async () => { await save(); })} className={ghost}>Save draft</button>}
            <button type="button" disabled={pending} onClick={() => start(async () => setPreview(await previewCampaign(f)))} className={ghost}><Eye aria-hidden className="size-4" /> Preview</button>
            <button type="button" disabled={pending || !sender} onClick={() => act(() => sendCampaignTest(c.id))} className={ghost}><FlaskConical aria-hidden className="size-4" /> Send me a test</button>
          </div>
          {editable && (
            <>
              <div className="flex flex-wrap items-end gap-2 border-t border-line/5 pt-3">
                <label className="flex flex-1 flex-col gap-1.5 text-sm"><span className="text-muted">Schedule for</span>
                  <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={input} /></label>
                <button type="button" disabled={pending || !at || !sender} onClick={() => act(() => sendCampaign(c.id, new Date(at).toISOString()))} className={ghost}>Schedule</button>
              </div>
              <button type="button" disabled={pending || !sender || !count}
                onClick={() => { if (confirm(`Send "${f.subject}" to ${count} ${count === 1 ? "person" : "people"} now?`)) act(() => sendCampaign(c.id, null)); }}
                className={`${primaryBtn} flex items-center justify-center gap-2`}><Send aria-hidden className="size-4" /> {pending ? "Working…" : `Send now to ${count ?? "…"}`}</button>
              {!sender && <p className="text-sm text-muted">Set your sender address and postal address on the Email page first.</p>}
              <button type="button" disabled={pending} onClick={() => { if (confirm("Delete this draft?")) start(async () => setMsg((await deleteCampaign(c.id)) ?? null)); }} className="flex min-h-10 w-fit items-center gap-2 rounded-full px-3 text-sm text-muted hover:text-score-1"><Trash2 aria-hidden className="size-4" /> Delete draft</button>
            </>
          )}
          {c.status === "scheduled" && <button type="button" disabled={pending} onClick={() => start(async () => setMsg((await cancelCampaign(c.id)) ?? null))} className={ghost}>Cancel schedule</button>}
          <Note msg={msg} />
        </div>
        {preview && (
          <div className="flex flex-col gap-2 rounded-card bg-surface-2 p-3">
            <p className="px-2 text-sm"><span className="text-muted">Subject:</span> {preview.subject}</p>
            <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="h-[560px] w-full rounded-2xl bg-white" />
          </div>
        )}
      </aside>
    </div>
  );
}
