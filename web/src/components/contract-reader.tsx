"use client";

import { FileSearch, Quote } from "lucide-react";
import { useState, useTransition } from "react";
import { applyContractDates, readContract } from "@/lib/actions";
import type { ContractRead } from "@/lib/contract";
import { money } from "@/lib/data";

type Row = { title: string; dueOn: string; quote: string; on: boolean };

/** Reads the purchase agreement's dates with AI and lets the agent check each one before it touches the deal. */
export function ContractReader({ dealId, pdfs, closeOn, price }: { dealId: string; pdfs: { id: string; name: string }[]; closeOn: string | null; price: number }) {
  const [doc, setDoc] = useState(pdfs[0]?.id ?? "");
  const [read, setRead] = useState<(ContractRead & { docName: string }) | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [useClose, setUseClose] = useState(true);
  const [usePrice, setUsePrice] = useState(true);
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();

  if (!pdfs.length) return <p className="text-sm text-muted">Upload the signed purchase agreement (PDF) under Documents and AI can read its deadlines into these milestones.</p>;

  const run = () => start(async () => {
    setMsg(null);
    const r = await readContract(dealId, doc);
    if ("error" in r) { setRead(null); setMsg({ error: r.error }); return; }
    setRead(r);
    setRows(r.deadlines.map((d) => ({ ...d, on: true })));
  });
  const apply = () => start(async () => {
    const r = await applyContractDates(dealId, {
      deadlines: rows.filter((x) => x.on).map(({ title, dueOn }) => ({ title, dueOn })),
      closeOn: useClose ? read?.closeOn : null, price: usePrice ? read?.price : null, docName: read?.docName ?? "contract",
    });
    setMsg(r ?? null);
    if (r?.ok) setRead(null);
  });
  const closeDiffers = !!read?.closeOn && read.closeOn !== closeOn;
  const priceDiffers = !!read?.price && read.price !== price;

  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface-2 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <FileSearch aria-hidden className="size-5 text-accent-ink" />
        <span className="font-medium">Read dates from the contract</span>
        <select value={doc} onChange={(e) => setDoc(e.target.value)} aria-label="Contract PDF" className="min-h-11 min-w-0 flex-1 rounded-2xl bg-surface-1 px-3">
          {pdfs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button type="button" onClick={run} disabled={pending || !doc} className="min-h-11 rounded-full bg-accent px-5 font-medium text-on-light hover:bg-accent-strong disabled:opacity-60">
          {pending && !read ? "Reading…" : "Read with AI"}
        </button>
      </div>

      {read && (
        <div className="flex flex-col gap-3">
          <p className="text-muted">Check each date against the contract words under it. Untick anything that&apos;s wrong; dates can be edited. Matching milestones are updated, the rest are added.</p>
          <ul className="flex flex-col gap-2">
            {rows.map((r, n) => (
              <li key={n} className={`flex flex-wrap items-start gap-3 rounded-2xl bg-surface-1 p-3 ${r.on ? "" : "opacity-60"}`}>
                <input type="checkbox" checked={r.on} aria-label={`Use ${r.title}`} onChange={(e) => setRows((x) => x.map((y, i) => (i === n ? { ...y, on: e.target.checked } : y)))} className="mt-2.5 size-5 accent-[var(--color-accent)]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    <input type="date" value={r.dueOn} aria-label={`Date for ${r.title}`} onChange={(e) => setRows((x) => x.map((y, i) => (i === n ? { ...y, dueOn: e.target.value } : y)))} className="min-h-10 rounded-xl bg-surface-3 px-2" />
                  </div>
                  {r.quote && <p className="mt-1.5 flex gap-1.5 text-xs text-muted"><Quote aria-hidden className="mt-0.5 size-3 shrink-0" /><span className="italic">{r.quote}</span></p>}
                </div>
              </li>
            ))}
          </ul>
          {closeDiffers && (
            <label className="flex items-center gap-3"><input type="checkbox" checked={useClose} onChange={(e) => setUseClose(e.target.checked)} className="size-5 accent-[var(--color-accent)]" />
              Set closing date to {read.closeOn} <span className="text-muted">(now {closeOn ?? "not set"})</span></label>
          )}
          {priceDiffers && (
            <label className="flex items-center gap-3"><input type="checkbox" checked={usePrice} onChange={(e) => setUsePrice(e.target.checked)} className="size-5 accent-[var(--color-accent)]" />
              Set price to {money(read.price!)} <span className="text-muted">(now {money(price)})</span></label>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={apply} disabled={pending || (!rows.some((r) => r.on) && !(closeDiffers && useClose) && !(priceDiffers && usePrice))}
              className="min-h-11 rounded-full bg-accent px-5 font-medium text-on-light hover:bg-accent-strong disabled:opacity-60">{pending ? "Saving…" : "Apply to this deal"}</button>
            <button type="button" onClick={() => setRead(null)} className="min-h-11 rounded-full px-4 text-muted hover:text-ink">Discard</button>
          </div>
        </div>
      )}
      {msg?.error && <p role="alert" className="text-score-1">{msg.error}</p>}
      {msg?.ok && <p role="status" className="text-accent-ink">Applied: {msg.ok}.</p>}
    </div>
  );
}
