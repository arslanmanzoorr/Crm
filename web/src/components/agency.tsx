"use client";

import { ArrowRight, Building2, Camera, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { applySnapshot, cancelAgencyInvite, createAgency, createSubaccount, deleteSnapshot, enterSubaccount, inviteAgencyStaff, removeAgencyStaff, saveSnapshot, setAgencyBrand, setSubBilling, uploadAgencyLogo, type FormState } from "@/lib/actions";
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

const STATUS: Record<string, { label: string; tone: string }> = {
  trial: { label: "Trial", tone: "bg-surface-3 text-ink" },
  active: { label: "Active", tone: "bg-accent/20 text-accent-ink" },
  past_due: { label: "Past due", tone: "bg-score-2/20 text-score-2" },
  paused: { label: "Paused", tone: "bg-score-1/20 text-score-1" },
};

/** Status, price and a note per sub-account. Pausing locks its own users out until it's resumed. */
export function BillingCell({ orgId, name, status, price, note }: { orgId: string; name: string; status: string; price: number | null; note: string }) {
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState(status);
  const [p, setP] = useState(price === null ? "" : String(price));
  const [n, setN] = useState(note);
  const [msg, setMsg] = useState<FormState | null>(null);
  const [pending, start] = useTransition();
  const s = STATUS[status] ?? STATUS.active;
  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Billing for ${name}: ${s.label}${price !== null ? `, $${price} a month` : ""}`}
        className="flex min-h-10 items-center gap-2 rounded-full px-1 text-sm hover:bg-surface-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.tone}`}>{s.label}</span>
        <span className="tabular-nums text-muted">{price !== null ? `$${price}/mo` : "No price"}</span>
      </button>
      {open && (
        <form className="flex flex-col gap-2 rounded-2xl bg-surface-1 p-3 text-sm" onSubmit={(e) => {
          e.preventDefault();
          if (st === "paused" && status !== "paused" && !confirm(`Pause ${name}? Its users are locked out until you resume it. Their data is kept.`)) return;
          start(async () => { const r = await setSubBilling(orgId, st, p, n); setMsg(r ?? null); if (r?.ok) setOpen(false); });
        }}>
          <div className="flex flex-wrap gap-2">
            <select value={st} onChange={(e) => setSt(e.target.value)} aria-label="Status" className={select}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <label className="flex items-center gap-1.5"><span className="text-muted">$</span>
              <input value={p} onChange={(e) => setP(e.target.value)} inputMode="decimal" aria-label="Monthly price" placeholder="per month" className={`${input} w-28`} />
            </label>
          </div>
          <input value={n} onChange={(e) => setN(e.target.value)} maxLength={300} aria-label="Billing note" placeholder="Note, e.g. invoiced on the 1st" className={input} />
          <button disabled={pending} className={`${primaryBtn} w-fit`}>{pending ? "Saving…" : "Save"}</button>
        </form>
      )}
      <Note msg={msg} />
    </div>
  );
}

/** Staff list; the owner invites by link and removes staff (never the owner). Anyone can leave. */
export function StaffManager({ agencyId, me, isOwner, staff, invites, site }: { agencyId: string; me: string; isOwner: boolean; staff: { userId: string; email: string; role: string }[]; invites: { id: string; email: string }[]; site: string }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<(FormState & { link?: string }) | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const copy = async (link: string) => { await navigator.clipboard.writeText(link); setCopied(link); setTimeout(() => setCopied(null), 1800); };
  return (
    <section aria-labelledby="staff" className="flex flex-col gap-3 rounded-card bg-surface-2 p-5 text-sm">
      <h3 id="staff" className="font-medium">Agency staff</h3>
      <ul className="flex flex-col divide-y divide-line/5">
        {staff.map((m) => (
          <li key={m.userId} className="flex min-h-12 items-center justify-between gap-3">
            <span className="min-w-0 truncate">{m.email}{m.userId === me && <span className="text-muted"> (you)</span>}</span>
            <span className="flex items-center gap-2">
              <span className="text-muted capitalize">{m.role}</span>
              {m.role !== "owner" && (isOwner || m.userId === me) && (
                <button type="button" onClick={() => { if (confirm(m.userId === me ? "Leave this agency? You will lose access to its sub-accounts." : `Remove ${m.email}? They lose access to every sub-account.`)) start(async () => setMsg((await removeAgencyStaff(agencyId, m.userId)) ?? null)); }}
                  className="min-h-10 rounded-full px-3 text-score-1 hover:bg-surface-3">{m.userId === me ? "Leave" : "Remove"}</button>
              )}
            </span>
          </li>
        ))}
        {invites.map((i) => (
          <li key={i.id} className="flex min-h-12 items-center justify-between gap-3 text-muted">
            <span className="min-w-0 truncate">{i.email} · invited</span>
            {isOwner && <span className="flex gap-1">
              <button type="button" onClick={() => copy(`${site}/agency-invite/${i.id}`)} className="min-h-10 rounded-full px-3 hover:bg-surface-3 hover:text-ink">{copied === `${site}/agency-invite/${i.id}` ? "Copied" : "Copy link"}</button>
              <button type="button" onClick={() => start(async () => setMsg((await cancelAgencyInvite(i.id)) ?? null))} className="min-h-10 rounded-full px-3 hover:bg-surface-3 hover:text-score-1">Cancel</button>
            </span>}
          </li>
        ))}
      </ul>
      {isOwner && (
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await inviteAgencyStaff(agencyId, email); setMsg(r ?? null); if (r?.ok) setEmail(""); }); }}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={320} placeholder="teammate@youragency.com" aria-label="Staff email" className={`${input} min-w-48 flex-1`} />
          <button disabled={pending} className={primaryBtn}>{pending ? "Inviting…" : "Invite"}</button>
        </form>
      )}
      {msg?.link && (
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-2xl bg-surface-1 px-3 py-2.5 text-xs">{msg.link}</code>
          <button type="button" onClick={() => copy(msg.link!)} className="min-h-10 rounded-full bg-surface-3 px-4 hover:bg-surface-light hover:text-on-light">{copied === msg.link ? "Copied" : "Copy link"}</button>
        </div>
      )}
      <Note msg={msg} />
      <p className="text-muted">Staff can open every sub-account. They join it as agency staff, stay out of lead rotation, and are marked &ldquo;Agency&rdquo; on its team page.</p>
    </section>
  );
}

export function AgencyLogo({ agencyId, logo, name }: { agencyId: string; logo: string | null; name: string }) {
  const [msg, setMsg] = useState<FormState | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="grid size-14 place-items-center overflow-hidden rounded-2xl bg-surface-light text-xl font-semibold text-on-light">
        {/* eslint-disable-next-line @next/next/no-img-element -- public Storage URL */}
        {logo ? <img src={logo} alt={`${name} logo`} className="size-full object-contain p-1.5" /> : name[0]?.toUpperCase()}
      </span>
      <input id="agency-logo" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.set("logo", f); start(async () => setMsg((await uploadAgencyLogo(agencyId, fd)) ?? null)); }} />
      <label htmlFor="agency-logo" className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-surface-3 px-4 font-medium hover:bg-surface-light hover:text-on-light">{pending ? "Uploading…" : logo ? "Replace logo" : "Upload logo"}</label>
      <span className="text-muted">Shown on your sign-in page and for sub-accounts without their own logo.</span>
      <Note msg={msg} />
    </div>
  );
}
