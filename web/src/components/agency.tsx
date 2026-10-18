"use client";

import { ArrowRight, Building2, Camera, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { applySnapshot, createAgency, createSubaccount, deleteSnapshot, enterSubaccount, saveSnapshot, setAgencyBrand, type FormState } from "@/lib/actions";
import { brandColorError } from "@/lib/brand";
import { input, primaryBtn } from "./form-classes";

type Opt = { id: string; name: string };
const Note = ({ msg }: { msg: FormState | null }) => (msg?.error ? <p role="alert" className="text-sm text-score-1">{msg.error}</p> : msg?.ok ? <p role="status" className="text-sm text-accent-ink">{msg.ok}</p> : null);
const select = "min-h-11 rounded-2xl bg-surface-1 px-3 text-sm";

/** Opens a sub-account as agency staff. */
export function EnterButton({ orgId, name }: { orgId: string; name: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<FormState | null>(null);
  return (
    <>
      <button type="button" disabled={pending} onClick={() => start(async () => setMsg((await enterSubaccount(orgId)) ?? null))} aria-label={`Open ${name}`}
        className="flex min-h-10 items-center gap-1.5 rounded-full bg-surface-light px-4 text-sm font-medium text-on-light hover:bg-white disabled:opacity-60">
        {pending ? "Opening…" : "Open"} <ArrowRight aria-hidden className="size-4" />
      </button>
      {msg?.error && <span role="alert" className="text-xs text-score-1">{msg.error}</span>}
    </>
  );
}

export function NewSubaccount({ agencyId, snapshots }: { agencyId: string; snapshots: Opt[] }) {
  const [name, setName] = useState("");
  const [snap, setSnap] = useState(snapshots[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<FormState | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="flex flex-col gap-3 rounded-card bg-surface-2 p-5" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await createSubaccount(agencyId, name, snap || null, email); setMsg(r ?? null); if (r?.ok) { setName(""); setEmail(""); } }); }}>
      <h3 className="flex items-center gap-2 font-medium"><Plus aria-hidden className="size-4 text-accent-ink" /> New sub-account</h3>
      <label className="flex flex-col gap-1.5 text-sm">Team or client name
        <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} placeholder="e.g. Harbor & Pine Realty" className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">Start from snapshot
        <select value={snap} onChange={(e) => setSnap(e.target.value)} className={select}>
          <option value="">Blank setup</option>
          {snapshots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">Client&apos;s email <span className="text-muted">(optional: they get an invite as admin)</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={320} placeholder="owner@client.com" className={input} />
      </label>
      <button disabled={pending} className={`${primaryBtn} w-fit`}>{pending ? "Creating…" : "Create sub-account"}</button>
      <Note msg={msg} />
    </form>
  );
}

export function SnapshotTools({ subs, snapshots }: { subs: Opt[]; snapshots: Opt[] }) {
  const [from, setFrom] = useState(subs[0]?.id ?? "");
  const [name, setName] = useState("");
  const [snap, setSnap] = useState(snapshots[0]?.id ?? "");
  const [to, setTo] = useState(subs[0]?.id ?? "");
  const [msg, setMsg] = useState<FormState | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-4 rounded-card bg-surface-2 p-5 text-sm">
      <h3 className="flex items-center gap-2 font-medium"><Camera aria-hidden className="size-4 text-accent-ink" /> Snapshots</h3>
      <p className="text-muted">A snapshot copies a sub-account&apos;s setup (branding, modules, Today layout, calling hours, routing, commission tiers, automations and document templates). Never its leads or clients.</p>
      {subs.length > 0 && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveSnapshot(from, name); setMsg(r ?? null); if (r?.ok) setName(""); }); }}>
          <label className="flex min-w-40 flex-1 flex-col gap-1.5">Save the setup of
            <select value={from} onChange={(e) => setFrom(e.target.value)} className={select}>{subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </label>
          <label className="flex min-w-40 flex-1 flex-col gap-1.5">As
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} placeholder="e.g. Solo agent starter" className={input} />
          </label>
          <button disabled={pending} className="min-h-11 rounded-full bg-surface-3 px-4 font-medium hover:bg-surface-light hover:text-on-light disabled:opacity-60">Save snapshot</button>
        </form>
      )}
      {snapshots.length > 0 && subs.length > 0 && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (confirm("Apply this snapshot? It replaces the sub-account's branding and settings and adds the snapshot's automations and templates.")) start(async () => setMsg((await applySnapshot(snap, to)) ?? null)); }}>
          <label className="flex min-w-40 flex-1 flex-col gap-1.5">Apply
            <select value={snap} onChange={(e) => setSnap(e.target.value)} className={select}>{snapshots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </label>
          <label className="flex min-w-40 flex-1 flex-col gap-1.5">To
            <select value={to} onChange={(e) => setTo(e.target.value)} className={select}>{subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </label>
          <button disabled={pending} className="min-h-11 rounded-full bg-surface-3 px-4 font-medium hover:bg-surface-light hover:text-on-light disabled:opacity-60">Apply</button>
        </form>
      )}
      {snapshots.length > 0 && (
        <ul className="flex flex-col divide-y divide-line/5">
          {snapshots.map((s) => (
            <li key={s.id} className="flex min-h-11 items-center justify-between gap-3">
              <span>{s.name}</span>
              <button type="button" aria-label={`Delete snapshot ${s.name}`} onClick={() => { if (confirm(`Delete the snapshot "${s.name}"?`)) start(async () => setMsg((await deleteSnapshot(s.id)) ?? null)); }}
                className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface-3 hover:text-score-1"><Trash2 aria-hidden className="size-4" /></button>
            </li>
          ))}
        </ul>
      )}
      <Note msg={msg} />
    </div>
  );
}

export function AgencySettings({ id, name, color }: { id: string; name: string; color: string | null }) {
  const [n, setN] = useState(name);
  const [c, setC] = useState(color ?? "#c5f36a");
  const [msg, setMsg] = useState<FormState | null>(null);
  const [pending, start] = useTransition();
  const warn = brandColorError(c);
  return (
    <form className="flex flex-col gap-3 rounded-card bg-surface-2 p-5 text-sm" onSubmit={(e) => { e.preventDefault(); start(async () => setMsg((await setAgencyBrand(id, n, c)) ?? null)); }}>
      <h3 className="flex items-center gap-2 font-medium"><Building2 aria-hidden className="size-4 text-accent-ink" /> Agency settings</h3>
      <label className="flex flex-col gap-1.5">Agency name<input value={n} onChange={(e) => setN(e.target.value)} required minLength={2} maxLength={80} className={input} /></label>
      <label className="flex items-center gap-3">
        <input type="color" value={c} onChange={(e) => setC(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg bg-transparent" />
        Default accent for sub-accounts that haven&apos;t picked their own
      </label>
      {warn && <p className="text-score-1">{warn}</p>}
      <button disabled={pending || !!warn} className={`${primaryBtn} w-fit`}>{pending ? "Saving…" : "Save"}</button>
      <Note msg={msg} />
    </form>
  );
}

/** Account page: start an agency to run teams for clients. */
export function StartAgency() {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<FormState | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="flex flex-col gap-3 rounded-card bg-surface-2 p-4 text-sm" onSubmit={(e) => { e.preventDefault(); start(async () => setMsg((await createAgency(name)) ?? null)); }}>
      <p><span className="font-medium">Run EstateOS for other teams.</span> <span className="text-muted">Create sub-accounts for clients, copy your setup to each with snapshots, and see every team&apos;s numbers in one place.</span></p>
      <div className="flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} placeholder="Agency name" aria-label="Agency name" className={`${input} min-w-48 flex-1`} />
        <button disabled={pending} className={primaryBtn}>{pending ? "Creating…" : "Start an agency"}</button>
      </div>
      <Note msg={msg} />
    </form>
  );
}
