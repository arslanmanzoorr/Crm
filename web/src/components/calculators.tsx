"use client";

import { Check, Copy } from "lucide-react";
import { useState, useTransition } from "react";
import { saveNoteToLead } from "@/lib/actions";
import { analyzeRental, maxPrice, monthlyCost, type Rental } from "@/lib/finance";
import { inputAuto } from "./forms";

const usd = (n: number, cents = false) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents ? 2 : 0 });
const pct = (n: number) => `${n.toFixed(2)}%`;

function Num({ label, value, onChange, step = 1, suffix, hint }: { label: string; value: number; onChange: (v: number) => void; step?: number; suffix?: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="relative">
        <input type="number" inputMode="decimal" min={0} step={step} value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} className={`${inputAuto} w-full ${suffix ? "pr-14" : ""}`} />
        {suffix && <span aria-hidden className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted">{suffix}</span>}
      </span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Row({ k, v, strong, sub }: { k: string; v: string; strong?: boolean; sub?: string }) {
  return (
    <>
      <dt className={strong ? "font-medium" : "text-on-light/70"}>{k}{sub && <span className="block text-xs font-normal text-on-light/60">{sub}</span>}</dt>
      <dd className={`text-right tabular-nums ${strong ? "font-medium" : ""}`}>{v}</dd>
    </>
  );
}

/** Copy the summary, or file it on a lead's timeline. */
function Share({ text, leads }: { text: string; leads: { id: string; name: string }[] }) {
  const [copied, setCopied] = useState(false);
  const [lead, setLead] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
          className="flex min-h-11 items-center gap-2 rounded-full bg-surface-3 px-4 text-sm hover:bg-surface-1">
          {copied ? <Check aria-hidden className="size-4 text-accent" /> : <Copy aria-hidden className="size-4" />}{copied ? "Copied" : "Copy summary"}
        </button>
        <select aria-label="Lead to save to" value={lead} onChange={(e) => setLead(e.target.value)} className={inputAuto}>
          <option value="">Save to a lead…</option>
          {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <button type="button" disabled={!lead || pending} onClick={() => start(async () => { const r = await saveNoteToLead(lead, text); setMsg(r?.ok ?? r?.error ?? null); })}
          className="min-h-11 rounded-full bg-surface-3 px-4 text-sm hover:bg-surface-1 disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
      </div>
      <p aria-live="polite" className="text-sm text-accent empty:hidden">{msg}</p>
    </div>
  );
}

const Disclaimer = () => <p className="text-xs text-muted">Estimates for conversation, not a loan offer or credit decision. Rates, taxes, insurance and fees vary; a lender confirms the real numbers.</p>;

export function PaymentCalculator({ initialPrice, leads }: { initialPrice: number; leads: { id: string; name: string }[] }) {
  const [h, setH] = useState({ price: initialPrice || 450_000, downPct: 10, ratePct: 6.75, years: 30, taxPct: 1.1, insurance: 1800, hoa: 0, pmiPct: 0.5 });
  const set = (k: keyof typeof h) => (v: number) => setH({ ...h, [k]: v });
  const m = monthlyCost(h);
  const down = h.price - m.loan;
  const text = `Estimated monthly payment for a ${usd(h.price)} home with ${h.downPct}% down at ${h.ratePct}% for ${h.years} years: ${usd(m.total)} (principal and interest ${usd(m.pi)}, taxes ${usd(m.tax)}, insurance ${usd(m.ins)}${m.pmi ? `, PMI ${usd(m.pmi)}` : ""}${h.hoa ? `, HOA ${usd(h.hoa)}` : ""}). Cash to close about ${usd(down + h.price * 0.02)}–${usd(down + h.price * 0.05)} including closing costs. Estimate only; your lender confirms the numbers.`;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Num label="Price" value={h.price} onChange={set("price")} step={1000} />
        <Num label="Down payment" value={h.downPct} onChange={set("downPct")} step={0.5} suffix="%" hint={usd(down)} />
        <Num label="Interest rate" value={h.ratePct} onChange={set("ratePct")} step={0.125} suffix="%" />
        <Num label="Term" value={h.years} onChange={set("years")} suffix="yrs" />
        <Num label="Property tax" value={h.taxPct} onChange={set("taxPct")} step={0.05} suffix="%/yr" />
        <Num label="Insurance" value={h.insurance} onChange={set("insurance")} step={50} suffix="/yr" />
        <Num label="HOA" value={h.hoa} onChange={set("hoa")} step={10} suffix="/mo" />
        <Num label="PMI" value={h.pmiPct} onChange={set("pmiPct")} step={0.05} suffix="%/yr" hint="Under 20% down" />
      </div>
      <div className="flex flex-col gap-3">
        <section aria-label="Monthly payment" className="rounded-card bg-surface-light p-5 text-on-light">
          <p className="text-sm text-on-light/70">Estimated monthly payment</p>
          <p className="text-4xl font-light tabular-nums">{usd(m.total)}</p>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1 text-sm">
            <Row k="Principal and interest" v={usd(m.pi)} />
            <Row k="Property tax" v={usd(m.tax)} />
            <Row k="Insurance" v={usd(m.ins)} />
            {m.pmi > 0 && <Row k="PMI" v={usd(m.pmi)} />}
            {h.hoa > 0 && <Row k="HOA" v={usd(h.hoa)} />}
            <Row k="Loan amount" v={usd(m.loan)} strong />
            <Row k="Cash to close" sub="Down payment + 2–5% closing costs" v={`${usd(down + h.price * 0.02)}–${usd(down + h.price * 0.05)}`} strong />
          </dl>
        </section>
        <Share text={text} leads={leads} />
        <Disclaimer />
      </div>
    </div>
  );
}

export function AffordabilityCalculator({ leads }: { leads: { id: string; name: string }[] }) {
  const [a, setA] = useState({ monthlyIncome: 9000, monthlyDebts: 600, frontPct: 28, backPct: 36, downPct: 10, ratePct: 6.75, years: 30, taxPct: 1.1, insurance: 1800, hoa: 0, pmiPct: 0.5 });
  const set = (k: keyof typeof a) => (v: number) => setA({ ...a, [k]: v });
  const r = maxPrice(a);
  const m = monthlyCost({ ...a, price: r.price });
  const text = `With ${usd(a.monthlyIncome)}/month gross income and ${usd(a.monthlyDebts)}/month in other debts, a comfortable price is about ${usd(r.price)} (${a.downPct}% down at ${a.ratePct}%), around ${usd(m.total)}/month all in. Based on the ${a.frontPct}/${a.backPct} guideline; a lender's preapproval is the real answer.`;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Num label="Gross income" value={a.monthlyIncome} onChange={set("monthlyIncome")} step={100} suffix="/mo" />
        <Num label="Other debts" value={a.monthlyDebts} onChange={set("monthlyDebts")} step={50} suffix="/mo" hint="Car, cards, student loans" />
        <Num label="Housing limit" value={a.frontPct} onChange={set("frontPct")} suffix="%" hint="Of income" />
        <Num label="All debts limit" value={a.backPct} onChange={set("backPct")} suffix="%" hint="Of income" />
        <Num label="Down payment" value={a.downPct} onChange={set("downPct")} step={0.5} suffix="%" />
        <Num label="Interest rate" value={a.ratePct} onChange={set("ratePct")} step={0.125} suffix="%" />
        <Num label="Property tax" value={a.taxPct} onChange={set("taxPct")} step={0.05} suffix="%/yr" />
        <Num label="Insurance" value={a.insurance} onChange={set("insurance")} step={50} suffix="/yr" />
      </div>
      <div className="flex flex-col gap-3">
        <section aria-label="Affordability" className="rounded-card bg-surface-light p-5 text-on-light">
          <p className="text-sm text-on-light/70">Comfortable price</p>
          <p className="text-4xl font-light tabular-nums">{r.price ? usd(r.price) : "–"}</p>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1 text-sm">
            <Row k="Housing budget" v={`${usd(r.budget)}/mo`} />
            <Row k="Payment at that price" v={`${usd(m.total)}/mo`} />
            <Row k="Down payment" v={usd(r.price * a.downPct / 100)} strong />
          </dl>
          {!r.price && <p className="mt-2 text-sm">Other debts already use the whole budget at these limits.</p>}
        </section>
        <Share text={text} leads={leads} />
        <Disclaimer />
      </div>
    </div>
  );
}

export function InvestmentAnalyzer({ initialPrice, initialRent = 0, leads }: { initialPrice: number; initialRent?: number; leads: { id: string; name: string }[] }) {
  const [x, setX] = useState<Rental>({ price: initialPrice || 300_000, rehab: 15_000, closingPct: 3, downPct: 25, ratePct: 7.25, years: 30, rent: initialRent || 2600, otherIncome: 0, vacancyPct: 5, taxPct: 1.1, insurance: 1400, hoa: 0, mgmtPct: 8, maintenancePct: 8, otherExpenses: 0 });
  const set = (k: keyof Rental) => (v: number) => setX({ ...x, [k]: v });
  const r = analyzeRental(x);
  const text = `Rental analysis, ${usd(x.price)} purchase${x.rehab ? ` + ${usd(x.rehab)} rehab` : ""}, ${usd(x.rent)}/month rent: NOI ${usd(r.noi)}/yr, cap rate ${pct(r.capRate)}, cash flow ${usd(r.cashFlow / 12)}/month, cash-on-cash ${pct(r.cashOnCash)} on ${usd(r.cashIn)} invested${r.dscr ? `, DSCR ${r.dscr.toFixed(2)}` : ""}. Assumes ${x.vacancyPct}% vacancy, ${x.mgmtPct}% management, ${x.maintenancePct}% maintenance and reserves, ${x.downPct}% down at ${x.ratePct}%.`;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-5">
        <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4"><legend className="mb-2 text-sm font-medium">Purchase</legend>
          <Num label="Price" value={x.price} onChange={set("price")} step={1000} />
          <Num label="Rehab" value={x.rehab} onChange={set("rehab")} step={500} />
          <Num label="Closing costs" value={x.closingPct} onChange={set("closingPct")} step={0.25} suffix="%" />
          <Num label="Down payment" value={x.downPct} onChange={set("downPct")} step={0.5} suffix="%" />
          <Num label="Interest rate" value={x.ratePct} onChange={set("ratePct")} step={0.125} suffix="%" />
          <Num label="Term" value={x.years} onChange={set("years")} suffix="yrs" />
        </fieldset>
        <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4"><legend className="mb-2 text-sm font-medium">Income</legend>
          <Num label="Rent, all units" value={x.rent} onChange={set("rent")} step={25} suffix="/mo" />
          <Num label="Other income" value={x.otherIncome} onChange={set("otherIncome")} step={25} suffix="/mo" />
          <Num label="Vacancy" value={x.vacancyPct} onChange={set("vacancyPct")} step={0.5} suffix="%" />
        </fieldset>
        <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4"><legend className="mb-2 text-sm font-medium">Expenses</legend>
          <Num label="Property tax" value={x.taxPct} onChange={set("taxPct")} step={0.05} suffix="%/yr" />
          <Num label="Insurance" value={x.insurance} onChange={set("insurance")} step={50} suffix="/yr" />
          <Num label="HOA" value={x.hoa} onChange={set("hoa")} step={10} suffix="/mo" />
          <Num label="Management" value={x.mgmtPct} onChange={set("mgmtPct")} step={0.5} suffix="%" />
          <Num label="Maintenance + reserves" value={x.maintenancePct} onChange={set("maintenancePct")} step={0.5} suffix="%" />
          <Num label="Other" value={x.otherExpenses} onChange={set("otherExpenses")} step={10} suffix="/mo" />
        </fieldset>
      </div>
      <div className="flex flex-col gap-3">
        <section aria-label="Returns" className="rounded-card bg-surface-light p-5 text-on-light">
          <p className="text-sm text-on-light/70">Monthly cash flow</p>
          <p className={`text-4xl font-light tabular-nums ${r.cashFlow < 0 ? "text-[#b42318]" : ""}`}>{usd(r.cashFlow / 12)}</p>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1 text-sm">
            <Row k="Cap rate" sub="NOI ÷ price + rehab" v={pct(r.capRate)} strong />
            <Row k="Cash-on-cash" sub="Yearly cash flow ÷ cash in" v={pct(r.cashOnCash)} strong />
            <Row k="DSCR" sub="NOI ÷ loan payments; lenders like 1.25+" v={r.dscr ? r.dscr.toFixed(2) : "–"} />
            <Row k="Net operating income" v={`${usd(r.noi)}/yr`} />
            <Row k="Operating expenses" v={`${usd(r.opex)}/yr`} />
            <Row k="Loan payments" v={`${usd(r.debt)}/yr`} />
            <Row k="Cash invested" sub="Down + closing + rehab" v={usd(r.cashIn)} />
            <Row k="Gross rent multiplier" v={r.grm ? r.grm.toFixed(1) : "–"} />
            <Row k="1% rule" v={r.onePercent ? "Meets it" : "Below"} />
          </dl>
        </section>
        <Share text={text} leads={leads} />
        <Disclaimer />
      </div>
    </div>
  );
}
