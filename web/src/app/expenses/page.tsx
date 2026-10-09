import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CsvDownload } from "@/components/csv-download";
import { DeleteExpense, ExpenseForm } from "@/components/money-controls";
import { Skeleton } from "@/components/ui";
import { money } from "@/lib/data";
import { dbEnabled, EXPENSE_CATEGORIES, getExpenses, listDeals } from "@/lib/db";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-4xl font-light">Expenses</h1>
        <p className="mt-1 text-muted">What the business spends, by category, by deal and by the lead source it paid for.</p>
      </header>
      {dbEnabled ? <Suspense fallback={<Skeleton className="h-64" />}><Ledger /></Suspense> : <p className="text-muted">Connect Supabase to track expenses.</p>}
    </div>
  );
}

const date = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

async function Ledger() {
  const year = new Date().getFullYear();
  const [items, deals] = await Promise.all([getExpenses({ since: `${year}-01-01` }), listDeals()]);
  const total = items.reduce((n, e) => n + e.amount, 0);
  const byCat = Object.entries(EXPENSE_CATEGORIES).map(([k, label]) => ({ label, sum: items.filter((e) => e.category === k).reduce((n, e) => n + e.amount, 0) })).filter((c) => c.sum > 0).sort((a, b) => b.sum - a.sum);
  const bySource = [...new Set(items.map((e) => e.source).filter(Boolean))].map((s) => ({ source: s!, sum: items.filter((e) => e.source === s).reduce((n, e) => n + e.amount, 0) })).sort((a, b) => b.sum - a.sum);

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-card bg-surface-2 p-4"><dt className="text-sm text-muted">Spent in {year}</dt><dd className="mt-1 text-2xl font-light tabular-nums">{money(total)}</dd></div>
        {byCat.slice(0, 3).map((c) => <div key={c.label} className="rounded-card bg-surface-2 p-4"><dt className="text-sm text-muted">{c.label}</dt><dd className="mt-1 text-2xl font-light tabular-nums">{money(c.sum)}</dd></div>)}
      </dl>

      {bySource.length > 0 && (
        <section aria-labelledby="sources" className="flex flex-col gap-2">
          <h2 id="sources" className="text-xl">Marketing by lead source</h2>
          <p className="-mt-1 text-sm text-muted">Cost per lead and per closing are on <Link href="/analytics?days=365" className="text-accent">Analytics</Link>.</p>
          <ul className="flex flex-wrap gap-2">{bySource.map((s) => <li key={s.source} className="rounded-card bg-surface-2 px-4 py-2.5 text-sm"><span className="text-muted">{s.source}</span> {money(s.sum)}</li>)}</ul>
        </section>
      )}

      <section aria-labelledby="add" className="flex flex-col gap-3 rounded-card bg-surface-2 p-5">
        <h2 id="add" className="text-lg">Add an expense</h2>
        <ExpenseForm deals={deals.map((d) => ({ id: d.id, address: d.address }))} />
      </section>

      <section aria-labelledby="list" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="list" className="text-xl">This year</h2>
          {items.length > 0 && <CsvDownload name={`expenses-${year}`} header={["Date", "Category", "Amount", "Vendor", "Lead source", "Deal", "Note"]}
            rows={items.map((e) => [e.spentOn, EXPENSE_CATEGORIES[e.category], e.amount, e.vendor, e.source ?? "", e.deal?.address ?? "", e.note])} />}
        </div>
        {items.length === 0 ? <p className="rounded-card bg-surface-2 p-5 text-sm text-muted">Nothing logged yet this year.</p> : (
          <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
            {items.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-sm">
                <span className="w-16 text-muted">{date(e.spentOn)}</span>
                <span className="min-w-0 flex-1 basis-40">{EXPENSE_CATEGORIES[e.category]}{e.vendor && <span className="text-muted"> · {e.vendor}</span>}{e.source && <span className="text-muted"> · for {e.source}</span>}{e.deal && <> · <Link href={`/deals/${e.deal.id}`} className="text-accent">{e.deal.address}</Link></>}</span>
                <span className="font-medium tabular-nums">{money(e.amount)}</span>
                <DeleteExpense id={e.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
