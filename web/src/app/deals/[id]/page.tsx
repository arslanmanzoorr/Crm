import { CircleAlert, CircleCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AddMilestone, DealStatus, MilestoneRow } from "@/components/deal-controls";
import { DealForm } from "@/components/deal-form";
import { Chip, Skeleton } from "@/components/ui";
import { cash, money } from "@/lib/data";
import { commission, daysBetween, riskFlags } from "@/lib/deals";
import { EXPENSE_CATEGORIES, getDeal, getDocuments, getExpenses, getFinancing, getMembers, teamToday } from "@/lib/db";
import { Documents } from "@/components/documents";
import { DeleteExpense, ExpenseForm, PayoutControls } from "@/components/money-controls";
import { ReadinessList } from "@/components/readiness-card";
import { EMPTY_FINANCING, readiness } from "@/lib/readiness";

export const metadata: Metadata = { title: "Deal" };

export default function DealPage({ params }: PageProps<"/deals/[id]">) {
  return (
    <Suspense fallback={<div className="flex flex-col gap-4"><Skeleton className="h-16 max-w-lg" /><Skeleton className="h-96" /></div>}>
      <DealView params={params} />
    </Suspense>
  );
}

const STATUS = { active: "Under contract", closed: "Closed", fell_through: "Fell through" } as const;

async function DealView({ params }: { params: PageProps<"/deals/[id]">["params"] }) {
  const d = await getDeal((await params).id);
  if (!d) notFound();
  const today = await teamToday();
  const flags = riskFlags({ status: d.status, closeOn: d.closeOn, lastContactOn: d.contact.lastActivityAt?.slice(0, 10) ?? null }, d.milestones, today);
  const c = commission(d.price, d.commissionPct, d.agentSplitPct, d.referralPct);
  const [costs, me, docs] = await Promise.all([getExpenses({ dealId: d.id }), getMembers(), getDocuments({ dealId: d.id })]);
  const spent = costs.reduce((n, e) => n + e.amount, 0);
  const isAdmin = me.members.some((m) => m.userId === me.me && (m.role === "owner" || m.role === "admin"));
  const fin = d.side === "buyer" && d.status === "active" ? readiness((await getFinancing(d.contact.id)) ?? EMPTY_FINANCING, { closeOn: d.closeOn, today }) : null;
  const done = d.milestones.filter((m) => m.doneAt).length;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/deals" className="-my-2 flex min-h-11 w-fit items-center text-sm text-muted hover:text-accent">← All deals</Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2"><Chip tone={d.status === "active" ? "accent" : "dark"}>{STATUS[d.status]}</Chip><Chip>{d.side === "buyer" ? "Buyer side" : "Seller side"}</Chip></div>
          <h1 className="mt-3 text-4xl font-light">{d.address}</h1>
          <p className="text-muted">
            Client <Link href={`/leads/${d.contact.id}`} className="text-ink hover:text-accent">{d.contact.name}</Link>
            {d.property && <> · <Link href={`/properties/${d.property.id}`} className="text-ink hover:text-accent">view listing</Link></>}
          </p>
        </div>
        <span className="text-4xl font-light text-accent">{money(d.price)}</span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="risk" className={`flex flex-col gap-2 rounded-card p-5 ${flags.some((f) => f.level === "high") ? "bg-score-1/10" : "bg-surface-2"}`}>
            <h2 id="risk" className="text-lg">What could slip</h2>
            {flags.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-ink/80"><CircleCheck aria-hidden className="size-4 text-accent" /> {d.status === "active" ? "On track. Nothing overdue or due in the next two days." : "This deal is " + STATUS[d.status].toLowerCase() + "."}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {flags.map((f) => (
                  <li key={f.text} className={`flex items-start gap-2 text-sm ${f.level === "high" ? "text-score-1" : "text-ink/80"}`}>
                    <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" /><span>{f.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {fin && (
            <section aria-label="Financing readiness" className="rounded-card bg-surface-2 p-5">
              <ReadinessList r={fin} />
              <Link href={`/leads/${d.contact.id}#financing`} className="mt-2 inline-block text-sm text-accent">Update financing</Link>
            </section>
          )}
          <section aria-labelledby="steps" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="steps" className="text-xl">Milestones</h2>
              <span className="text-sm text-muted">{done} of {d.milestones.length} done</span>
            </div>
            <ul className="flex flex-col divide-y divide-white/5 rounded-card bg-surface-2 px-5">
              {d.milestones.map((m) => <MilestoneRow key={m.id} m={m} overdue={!!m.dueOn && daysBetween(today, m.dueOn) < 0} />)}
              {d.milestones.length === 0 && <li className="py-4 text-sm text-muted">No steps yet.</li>}
            </ul>
            <AddMilestone dealId={d.id} />
          </section>

          <section aria-labelledby="docs" className="flex flex-col gap-3">
            <h2 id="docs" className="text-xl">Documents</h2>
            <Documents parent={{ deal_id: d.id }} docs={docs} />
          </section>
          <details className="rounded-card bg-surface-2 p-5">
            <summary className="min-h-11 cursor-pointer content-center text-lg">Edit terms and dates</summary>
            <div className="mt-3"><DealForm deal={d} /></div>
          </details>
          <DealStatus id={d.id} status={d.status} />
        </div>

        <aside className="flex flex-col gap-6">
          <section aria-labelledby="money" className="rounded-card bg-surface-light p-5 text-on-light">
            <h2 id="money" className="text-lg">Commission</h2>
            <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1.5 text-sm">
              <dt className="text-on-light/70">Gross ({d.commissionPct}%)</dt><dd>{cash(c.gci)}</dd>
              {c.referral > 0 && <><dt className="text-on-light/70">Referral ({d.referralPct}%)</dt><dd>−{cash(c.referral)}</dd></>}
              <dt className="text-on-light/70">Brokerage</dt><dd>{cash(c.brokerage)}</dd>
              <dt className="font-medium">You ({d.agentSplitPct}%)</dt><dd className="font-medium">{cash(c.agent)}</dd>
            </dl>
            <p className="mt-3 text-xs text-on-light/70">{d.status === "closed" ? "Earned" : "Projected, paid at closing"}</p>
            {d.status === "closed" && <div className="mt-4 border-t border-on-light/10 pt-3"><PayoutControls dealId={d.id} status={d.payoutStatus} canApprove={isAdmin} /></div>}
          </section>
          <section aria-labelledby="costs" className="flex flex-col gap-3 rounded-card bg-surface-2 p-5">
            <h2 id="costs" className="text-lg">Costs on this deal</h2>
            {costs.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm">
                {costs.map((e) => <li key={e.id} className="flex items-center gap-2"><span className="flex-1">{EXPENSE_CATEGORIES[e.category]}{e.vendor && <span className="text-muted"> · {e.vendor}</span>}</span><span className="tabular-nums">{cash(e.amount)}</span><DeleteExpense id={e.id} /></li>)}
              </ul>
            )}
            <p className="text-sm">Your profit: <span className="font-medium text-accent">{cash(c.agent - spent)}</span> <span className="text-muted">({cash(c.agent)} share − {cash(spent)} costs)</span></p>
            <ExpenseForm dealId={d.id} />
          </section>
          {d.notes && <section aria-labelledby="notes" className="rounded-card bg-surface-2 p-5"><h2 id="notes" className="text-lg">Notes</h2><p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{d.notes}</p></section>}
        </aside>
      </div>
    </div>
  );
}
