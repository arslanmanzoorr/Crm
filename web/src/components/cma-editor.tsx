"use client";

import { Plus, Printer, X } from "lucide-react";
import { useState, useTransition } from "react";
import { saveCma } from "@/lib/actions";
import { adjust, opinion, sellerNet, type Comp, type Home, type NetInputs, type Rates } from "@/lib/cma";
import type { Cma } from "@/lib/db";
import { inputAuto, primaryBtn } from "./forms";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const signed = (n: number) => (n === 0 ? "–" : `${n > 0 ? "+" : "−"}${usd(Math.abs(n))}`);
const cell = `${inputAuto} w-full min-w-0 px-3`;

function N({ label, value, onChange, step = 1, srOnly }: { label: string; value: number | string; onChange: (v: string) => void; step?: number; srOnly?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className={srOnly ? "sr-only" : "text-muted"}>{label}</span>
      <input type="number" step={step} value={value} onChange={(e) => onChange(e.target.value)} className={cell} />
    </label>
  );
}

let seq = 1;
const blankComp = (): Comp => ({ id: `n${seq++}`, address: "", status: "sold", price: 0, sqft: 0, beds: 0, baths: 0, soldOn: null, dom: null, adjust: 0, note: "" });

export function CmaEditor({ cma }: { cma: Cma }) {
  const [subject, setSubject] = useState<Home>(cma.subject);
  const [comps, setComps] = useState<Comp[]>(cma.comps.length ? cma.comps : [blankComp(), blankComp(), blankComp()]);
  const [rates, setRates] = useState<Rates>(cma.rates);
  const [net, setNet] = useState<NetInputs>(cma.net);
  const [listPrice, setListPrice] = useState<string>(cma.listPrice ? String(cma.listPrice) : "");
  const [notes, setNotes] = useState(cma.notes);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  const filled = comps.filter((c) => c.address && c.price > 0);
  const op = opinion(subject, filled, rates, today);
  const adjusted = filled.map((c) => adjust(subject, c, rates, today));
  const wsum = adjusted.reduce((n, a) => n + a.weight, 0) || 1;
  const setComp = (id: string, patch: Partial<Comp>) => setComps((all) => all.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const numOr0 = (v: string) => (v === "" ? 0 : Number(v));

  const scenarios = op ? [["Low", op.low], ["Suggested", op.mid], ["High", op.high]] as const : [];
  const lp = Number(listPrice) || 0;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="subject" className="flex flex-col gap-3">
        <h2 id="subject" className="text-xl">The home</h2>
        <div className="grid max-w-md grid-cols-3 gap-3">
          <N label="Sqft" value={subject.sqft} onChange={(v) => setSubject({ ...subject, sqft: numOr0(v) })} />
          <N label="Beds" value={subject.beds} onChange={(v) => setSubject({ ...subject, beds: numOr0(v) })} />
          <N label="Baths" value={subject.baths} step={0.25} onChange={(v) => setSubject({ ...subject, baths: numOr0(v) })} />
        </div>
      </section>

      <section aria-labelledby="comps" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="comps" className="text-xl">Comparable sales</h2>
            <p className="text-sm text-muted">From your MLS: recent nearby sales first. Adjustments move each comp toward this home.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <N label="$ per sqft difference" value={rates.perSqft} onChange={(v) => setRates({ ...rates, perSqft: numOr0(v) })} />
            <N label="$ per bedroom" value={rates.perBed} step={500} onChange={(v) => setRates({ ...rates, perBed: numOr0(v) })} />
            <N label="$ per bathroom" value={rates.perBath} step={500} onChange={(v) => setRates({ ...rates, perBath: numOr0(v) })} />
          </div>
        </div>
        <ol className="flex flex-col gap-3">
          {comps.map((c, i) => {
            const a = c.address && c.price > 0 ? adjust(subject, c, rates, today) : null;
            return (
              <li key={c.id} className="flex flex-col gap-3 rounded-card bg-surface-2 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Comp {i + 1}</span>
                  <input aria-label={`Comp ${i + 1} address`} value={c.address} onChange={(e) => setComp(c.id, { address: e.target.value })} placeholder="Address" className={`${cell} flex-1`} />
                  <select aria-label={`Comp ${i + 1} status`} value={c.status} onChange={(e) => setComp(c.id, { status: e.target.value as Comp["status"] })} className={inputAuto}>
                    <option value="sold">Sold</option><option value="pending">Pending</option><option value="active">Active</option>
                  </select>
                  <button type="button" aria-label={`Remove comp ${i + 1}`} onClick={() => setComps((all) => all.filter((x) => x.id !== c.id))} className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-3"><X aria-hidden className="size-4" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
                  <N label="Price" value={c.price || ""} onChange={(v) => setComp(c.id, { price: numOr0(v) })} />
                  <N label="Sqft" value={c.sqft || ""} onChange={(v) => setComp(c.id, { sqft: numOr0(v) })} />
                  <N label="Beds" value={c.beds} onChange={(v) => setComp(c.id, { beds: numOr0(v) })} />
                  <N label="Baths" value={c.baths} step={0.25} onChange={(v) => setComp(c.id, { baths: numOr0(v) })} />
                  <label className="flex flex-col gap-1 text-sm"><span className="text-muted">{c.status === "sold" ? "Sold on" : "Listed on"}</span>
                    <input type="date" value={c.soldOn ?? ""} onChange={(e) => setComp(c.id, { soldOn: e.target.value || null })} className={cell} />
                  </label>
                  <N label="Days on market" value={c.dom ?? ""} onChange={(v) => setComp(c.id, { dom: v === "" ? null : Number(v) })} />
                  <N label="Other adj. $" value={c.adjust} step={500} onChange={(v) => setComp(c.id, { adjust: numOr0(v) })} />
                </div>
                <input aria-label={`Comp ${i + 1} note`} value={c.note} onChange={(e) => setComp(c.id, { note: e.target.value })} maxLength={500} placeholder="Why the other adjustment (e.g. pool, updated kitchen, busy street)" className={cell} />
                {a && (
                  <p className="text-sm text-ink/80">
                    Size {signed(a.sqftAdj)} · beds {signed(a.bedAdj)} · baths {signed(a.bathAdj)}{c.adjust !== 0 && <> · other {signed(c.adjust)}</>}
                    {" "}= <span className="font-medium text-ink">{usd(a.value)}</span> adjusted · weight {Math.round((a.weight / wsum) * 100)}%
                  </p>
                )}
              </li>
            );
          })}
        </ol>
        {comps.length < 30 && <button type="button" onClick={() => setComps([...comps, blankComp()])} className="flex min-h-10 w-fit items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1"><Plus aria-hidden className="size-4" /> Add a comp</button>}
      </section>

      <section aria-labelledby="value" className="flex flex-col gap-3">
        <h2 id="value" className="text-xl">Opinion of value</h2>
        {op ? (
          <div className="rounded-card bg-surface-light p-5 text-on-light">
            <p className="text-sm text-on-light/70">Suggested range from {op.used} comps</p>
            <p className="text-3xl font-light tabular-nums sm:text-4xl">{usd(op.low)} – {usd(op.high)}</p>
            <p className="mt-1 text-sm">Most likely around <span className="font-medium">{usd(op.mid)}</span> · {usd(op.perSqft)}/sqft</p>
          </div>
        ) : <p className="rounded-card bg-surface-2 p-5 text-sm text-muted">Add at least two comps with an address and price.</p>}
      </section>

      <section aria-labelledby="net" className="flex flex-col gap-3">
        <h2 id="net" className="text-xl">Seller net sheet</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <N label="Commission %" value={net.commissionPct} step={0.25} onChange={(v) => setNet({ ...net, commissionPct: numOr0(v) })} />
          <N label="Closing costs %" value={net.closingPct} step={0.25} onChange={(v) => setNet({ ...net, closingPct: numOr0(v) })} />
          <N label="Mortgage payoff" value={net.payoff} step={1000} onChange={(v) => setNet({ ...net, payoff: numOr0(v) })} />
          <N label="Concessions" value={net.concessions} step={500} onChange={(v) => setNet({ ...net, concessions: numOr0(v) })} />
          <N label="Other costs" value={net.other} step={500} onChange={(v) => setNet({ ...net, other: numOr0(v) })} />
        </div>
        <div className="max-w-xs"><N label="Your recommended list price" value={listPrice} step={1000} onChange={setListPrice} /></div>
        {(scenarios.length > 0 || lp > 0) && (
          <div className="overflow-x-auto rounded-card bg-surface-2 px-5" tabIndex={0} role="region" aria-label="Net at different prices">
            <table className="w-full min-w-[36rem] text-sm">
              <thead><tr className="border-b border-white/5 text-left text-muted"><th className="py-2.5 font-normal">Sale price</th><th className="px-3 text-right font-normal">Commission</th><th className="px-3 text-right font-normal">Closing</th><th className="px-3 text-right font-normal">Payoff + other</th><th className="text-right font-normal">Seller nets</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {[...scenarios, ...(lp > 0 ? [["Recommended", lp] as const] : [])].map(([label, price]) => {
                  const s = sellerNet(price, net);
                  return (
                    <tr key={label}><td className="py-2.5"><span className="text-muted">{label}</span> {usd(price)}</td><td className="px-3 text-right tabular-nums">{usd(s.commission)}</td><td className="px-3 text-right tabular-nums">{usd(s.closing)}</td><td className="px-3 text-right tabular-nums">{usd(s.payoff + s.concessions + s.other)}</td><td className="text-right font-medium tabular-nums">{usd(s.net)}</td></tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {op && lp > op.high * 1.03 && <p className="text-sm text-score-1">The recommended price is more than 3% above the comps&apos; range. Expect a longer time on market.</p>}
      </section>

      <section aria-labelledby="notes" className="flex flex-col gap-2">
        <h2 id="notes" className="text-xl">Private notes</h2>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={5000} placeholder="Seller's motivation, timing, condition. Never shown in the presentation." className={`${inputAuto} w-full resize-y`} />
      </section>

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-3 rounded-full bg-bg/90 py-2 backdrop-blur md:bottom-4">
        <button type="button" disabled={pending} className={primaryBtn}
          onClick={() => start(async () => setMsg((await saveCma(cma.id, { subject, comps: comps.filter((c) => c.address || c.price), rates, net, listPrice, notes })) ?? null))}>
          {pending ? "Saving…" : "Save"}
        </button>
        <a href={`/cma/${cma.id}/print`} target="_blank" rel="noopener" className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-5 text-sm hover:bg-surface-3"><Printer aria-hidden className="size-4" /> Presentation</a>
        <span aria-live="polite" className={`text-sm ${msg?.error ? "text-score-1" : "text-accent"}`}>{msg?.error ?? msg?.ok}</span>
      </div>
    </div>
  );
}
