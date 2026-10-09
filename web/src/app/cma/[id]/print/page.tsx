import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PrintButton } from "@/components/print-button";
import { adjust, opinion, sellerNet } from "@/lib/cma";
import { getCma, getMe } from "@/lib/db";

export const metadata: Metadata = { title: "Pricing presentation", robots: { index: false } };

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const signed = (n: number) => (n === 0 ? "–" : `${n > 0 ? "+" : "−"}${usd(Math.abs(n))}`);
const date = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** The seller-facing presentation: comps, adjustments, range and net. Private notes never appear here. */
export default function CmaPrint({ params }: PageProps<"/cma/[id]/print">) {
  return <Suspense><Sheet params={params} /></Suspense>;
}

async function Sheet({ params }: { params: PageProps<"/cma/[id]/print">["params"] }) {
  const [cma, me] = await Promise.all([params.then(({ id }) => getCma(id)), getMe()]);
  if (!cma) notFound();
  const today = new Date().toISOString().slice(0, 10);
  const o = opinion(cma.subject, cma.comps, cma.rates, today);
  const rows = cma.comps.filter((c) => c.price > 0).map((c) => adjust(cma.subject, c, cma.rates, today));
  const prices = [...new Set([...(o ? [o.low, o.mid, o.high] : []), ...(cma.listPrice ? [cma.listPrice] : [])])].sort((a, b) => a - b);
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 rounded-card bg-white p-8 text-neutral-900 print:max-w-none print:rounded-none print:p-0">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-600">Pricing analysis · {date(today)}</p>
          <h1 className="text-3xl font-light">{cma.address}</h1>
          <p className="text-neutral-600">{cma.subject.beds} bd · {cma.subject.baths} ba · {cma.subject.sqft.toLocaleString()} sqft</p>
        </div>
        <PrintButton />
      </header>

      {o && (
        <section className="rounded-2xl bg-neutral-100 p-6">
          <p className="text-sm text-neutral-600">Suggested price range</p>
          <p className="text-4xl font-light">{usd(o.low)} – {usd(o.high)}</p>
          <p className="mt-1">Most likely around <strong>{usd(o.mid)}</strong> ({usd(o.perSqft)} per sqft), from {o.used} comparable homes.</p>
          {cma.listPrice && <p className="mt-2">Recommended list price: <strong>{usd(cma.listPrice)}</strong></p>}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl">Comparable homes</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-neutral-300 text-left text-neutral-600"><th className="py-2 font-normal">Home</th><th className="font-normal">Status</th><th className="text-right font-normal">Price</th><th className="text-right font-normal">Adjustments</th><th className="text-right font-normal">Adjusted</th></tr></thead>
          <tbody className="divide-y divide-neutral-200">
            {rows.map((a) => (
              <tr key={a.comp.id}>
                <td className="py-2">{a.comp.address}<span className="block text-xs text-neutral-600">{a.comp.beds} bd · {a.comp.baths} ba · {a.comp.sqft.toLocaleString()} sqft{a.comp.soldOn && ` · ${date(a.comp.soldOn)}`}{a.comp.dom !== null && ` · ${a.comp.dom} days`}{a.comp.note && ` · ${a.comp.note}`}</span></td>
                <td className="capitalize">{a.comp.status}</td>
                <td className="text-right tabular-nums">{usd(a.comp.price)}</td>
                <td className="text-right tabular-nums">{signed(a.total)}</td>
                <td className="text-right font-medium tabular-nums">{usd(a.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-neutral-600">Adjustments: {usd(cma.rates.perSqft)} per square foot of size difference, {usd(cma.rates.perBed)} per bedroom, {usd(cma.rates.perBath)} per bathroom, plus noted differences. Recent sales of similar size count most.</p>
      </section>

      {prices.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl">What you&apos;d net</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-neutral-300 text-left text-neutral-600"><th className="py-2 font-normal">Sale price</th><th className="text-right font-normal">Commission</th><th className="text-right font-normal">Closing costs</th><th className="text-right font-normal">Payoff and other</th><th className="text-right font-normal">You net</th></tr></thead>
            <tbody className="divide-y divide-neutral-200">
              {prices.map((p) => {
                const s = sellerNet(p, cma.net);
                return <tr key={p}><td className="py-2">{usd(p)}</td><td className="text-right tabular-nums">{usd(s.commission)}</td><td className="text-right tabular-nums">{usd(s.closing)}</td><td className="text-right tabular-nums">{usd(s.payoff + s.concessions + s.other)}</td><td className="text-right font-medium tabular-nums">{usd(s.net)}</td></tr>;
              })}
            </tbody>
          </table>
          <p className="text-xs text-neutral-600">Estimates. Commission is negotiable. Closing costs, taxes and payoff are confirmed by your title or escrow company.</p>
        </section>
      )}

      <footer className="border-t border-neutral-200 pt-4 text-sm text-neutral-600">Prepared by {me.name}{me.email && ` · ${me.email}`}. This is a broker price opinion based on comparable sales, not an appraisal.</footer>
    </article>
  );
}
