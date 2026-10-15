"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { addExpense, deleteExpense, setAnnualCap, setPayout, setSplit, setSplitTiers } from "@/lib/actions";
import type { Tier } from "@/lib/deals";
import { ActionForm, inputAuto, primaryBtn } from "./forms";

const CATEGORIES = { marketing: "Marketing", photography: "Photography", staging: "Staging", signage: "Signage", mls_fees: "MLS and dues", client_gifts: "Client gifts", travel: "Travel", other: "Other" } as const;
const SOURCES = ["Zillow", "Facebook Ads", "Instagram", "Website", "Referral", "Open House"];

/** Log a cost. With `dealId` it's tied to that deal; marketing can be credited to a lead source. */
export function ExpenseForm({ dealId, deals }: { dealId?: string; deals?: { id: string; address: string }[] }) {
  const [category, setCategory] = useState("marketing");
  return (
    <ActionForm action={addExpense} className="flex flex-wrap items-start gap-2">
      {(pending) => (
        <>
          {dealId && <input type="hidden" name="deal_id" value={dealId} />}
          <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className={inputAuto}>
            {Object.entries(CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input name="amount" type="number" inputMode="decimal" min={0.01} step="any" required placeholder="Amount" aria-label="Amount" className={`${inputAuto} w-32`} />
          <input name="spent_on" type="date" aria-label="Date" className={inputAuto} />
          <input name="vendor" maxLength={120} placeholder="Vendor" aria-label="Vendor" className={`${inputAuto} min-w-32 flex-1`} />
          {category === "marketing" && (
            <select name="source" defaultValue="" aria-label="Lead source it paid for" className={inputAuto}>
              <option value="">No lead source</option>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {!dealId && deals && (
            <select name="deal_id" defaultValue="" aria-label="Deal" className={inputAuto}>
              <option value="">No deal</option>
              {deals.map((d) => <option key={d.id} value={d.id}>{d.address}</option>)}
            </select>
          )}
          <button disabled={pending} className={primaryBtn}>{pending ? "…" : "Add"}</button>
        </>
      )}
    </ActionForm>
  );
}

export function DeleteExpense({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} aria-label="Delete expense" onClick={() => start(() => deleteExpense(id))}
      className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface-3 hover:text-score-1"><Trash2 aria-hidden className="size-4" /></button>
  );
}

const STEP = { pending: "Awaiting approval", approved: "Approved, not paid yet", paid: "Paid" } as const;

/** Commission payout for a closed deal: pending -> approved -> paid. Only owners and admins can move it. */
export function PayoutControls({ dealId, status, canApprove }: { dealId: string; status: keyof typeof STEP; canApprove: boolean }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const go = (s: keyof typeof STEP) => start(async () => { const r = await setPayout(dealId, s); setErr(r?.error ?? null); });
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>Payout: <span className={status === "paid" ? "text-accent-ink" : ""}>{STEP[status]}</span></p>
      {canApprove && (
        <div className="flex flex-wrap gap-2">
          {status === "pending" && <button type="button" disabled={pending} onClick={() => go("approved")} className={primaryBtn}>Approve payout</button>}
          {status === "approved" && <button type="button" disabled={pending} onClick={() => go("paid")} className={primaryBtn}>Mark paid</button>}
          {status !== "pending" && <button type="button" disabled={pending} onClick={() => go("pending")} className="min-h-11 rounded-full px-4 text-muted hover:bg-surface-3">Undo</button>}
        </div>
      )}
      {err && <p role="alert" className="text-score-1">{err}</p>}
    </div>
  );
}

export function SplitInput({ userId, value, label }: { userId: string; value: number; label: string }) {
  const [v, setV] = useState(String(value));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const save = () => { const n = Number(v); if (n !== value) start(async () => { const r = await setSplit(userId, n); setMsg(r?.error ?? null); }); };
  return (
    <span className="flex items-center gap-2">
      <input type="number" min={0} max={100} step="any" value={v} disabled={pending} aria-label={`${label} split %`}
        onChange={(e) => setV(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && save()} className={`${inputAuto} w-20 px-3`} />
      <span className="text-muted">%</span>
      {msg && <span role="alert" className="text-score-1">{msg}</span>}
    </span>
  );
}

/** Annual cap on what the agent pays the brokerage. Empty = no cap. */
export function CapInput({ userId, value, label }: { userId: string; value: number | null; label: string }) {
  const [v, setV] = useState(value === null ? "" : String(value));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const save = () => {
    const n = v.trim() === "" ? null : Number(v);
    if (n !== value) start(async () => { const r = await setAnnualCap(userId, n); setMsg(r?.error ?? null); });
  };
  return (
    <span className="flex items-center gap-2">
      <span className="text-muted">cap $</span>
      <input type="number" min={0} step="any" inputMode="numeric" value={v} disabled={pending} placeholder="none" aria-label={`${label} annual cap`}
        onChange={(e) => setV(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && save()} className={`${inputAuto} w-28 px-3`} />
      {msg && <span role="alert" className="text-score-1">{msg}</span>}
    </span>
  );
}

/** Team commission tiers: past each year-to-date GCI threshold, new deals suggest a higher split. */
export function TierEditor({ tiers }: { tiers: Tier[] }) {
  const [rows, setRows] = useState(tiers.map((t) => ({ gci: String(t.gci), split: String(t.split) })));
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (i: number, k: "gci" | "split", v: string) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div className="flex flex-col gap-2 rounded-card bg-surface-2 p-4 text-sm">
      {rows.length === 0 && <p className="text-muted">No tiers. Every deal starts at the agent&apos;s own split.</p>}
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <span className="text-muted">After $</span>
          <input type="number" min={1} step="any" inputMode="numeric" value={r.gci} onChange={(e) => set(i, "gci", e.target.value)} aria-label={`Tier ${i + 1} GCI threshold`} className={`${inputAuto} w-32 px-3`} />
          <span className="text-muted">GCI this year, split</span>
          <input type="number" min={0} max={100} step="any" value={r.split} onChange={(e) => set(i, "split", e.target.value)} aria-label={`Tier ${i + 1} split %`} className={`${inputAuto} w-20 px-3`} />
          <span className="text-muted">%</span>
          <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={`Remove tier ${i + 1}`} className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-3 hover:text-ink"><Trash2 aria-hidden className="size-4" /></button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {rows.length < 5 && (
          <button type="button" onClick={() => setRows([...rows, { gci: "", split: "" }])} className="flex min-h-10 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 hover:bg-surface-1"><Plus aria-hidden className="size-4" /> Add tier</button>
        )}
        <button type="button" disabled={pending} className={primaryBtn}
          onClick={() => start(async () => setMsg((await setSplitTiers(rows.map((r) => ({ gci: Number(r.gci), split: Number(r.split) })))) ?? null))}>{pending ? "Saving…" : "Save tiers"}</button>
        {msg?.error && <span role="alert" className="text-score-1">{msg.error}</span>}
        {msg?.ok && <span role="status" className="text-muted">{msg.ok}</span>}
      </div>
    </div>
  );
}
