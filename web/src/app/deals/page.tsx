import { CircleAlert, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { money } from "@/lib/data";
import { commission, daysBetween, riskFlags } from "@/lib/deals";
import { dbEnabled, listDeals, type Deal } from "@/lib/db";

export const metadata: Metadata = { title: "Deals" };

export default function DealsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-light">Deals</h1>
        <Link href="/deals/new" className="flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-on-light hover:bg-accent-strong">
          <Plus aria-hidden className="size-4" /> New deal
        </Link>
      </header>
      {dbEnabled ? (
        <Suspense fallback={<div className="flex flex-col gap-3"><Skeleton className="h-24" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>}>
          <Board />
        </Suspense>
      ) : <p className="text-muted">Connect Supabase to track deals.</p>}
    </div>
  );
}

const take = (d: Deal) => commission(d.price, d.commissionPct, d.agentSplitPct, d.referralPct).agent;

async function Board() {
  const deals = await listDeals();
  const today = new Date().toISOString().slice(0, 10); // ponytail: UTC day; per-agent timezone if flags look a day off
  const active = deals.filter((d) => d.status === "active");
  const closed = deals.filter((d) => d.status === "closed");
  const soon = active.filter((d) => d.closeOn && daysBetween(today, d.closeOn) <= 30);

  if (deals.length === 0)
    return (
      <div className="rounded-card bg-surface-2 p-8 text-center">
        <p className="text-lg">No deals yet</p>
        <p className="mt-1 text-muted">When an offer is accepted, open a deal from the client&apos;s page or here. You&apos;ll get a milestone checklist, deadline warnings and your commission.</p>
      </div>
    );

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active deals" value={String(active.length)} />
        <Stat label="Closing in 30 days" value={money(soon.reduce((n, d) => n + take(d), 0))} sub={`${soon.length} deal${soon.length === 1 ? "" : "s"}, your share`} />
        <Stat label="Pending, your share" value={money(active.reduce((n, d) => n + take(d), 0))} />
        <Stat label={`Earned in ${today.slice(0, 4)}`} value={money(closed.reduce((n, d) => n + take(d), 0))} sub={`${closed.length} closed`} accent />
      </dl>

      <section aria-labelledby="active" className="flex flex-col gap-3">
        <h2 id="active" className="text-xl">Under contract</h2>
        {active.length === 0 && <p className="text-sm text-muted">Nothing under contract right now.</p>}
        <ul className="grid gap-3 lg:grid-cols-2">
          {active.map((d) => <DealCard key={d.id} d={d} today={today} />)}
        </ul>
      </section>

      {closed.length > 0 && (
        <section aria-labelledby="closed" className="flex flex-col gap-3">
          <h2 id="closed" className="text-xl">Closed this year</h2>
          <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
            {closed.map((d) => (
              <li key={d.id}>
                <Link href={`/deals/${d.id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 px-5 py-3 hover:bg-surface-3">
                  <span className="min-w-0"><span className="font-medium">{d.contact.name}</span> <span className="text-muted">· {d.address}</span></span>
                  <span className="text-sm text-muted">{money(d.price)} · you {money(take(d))}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-card bg-surface-2 p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`mt-1 text-2xl font-light ${accent ? "text-accent" : ""}`}>{value}</dd>
      {sub && <dd className="text-xs text-muted">{sub}</dd>}
    </div>
  );
}

function DealCard({ d, today }: { d: Deal; today: string }) {
  const flags = riskFlags({ status: d.status, closeOn: d.closeOn, lastContactOn: d.contact.lastActivityAt?.slice(0, 10) ?? null }, d.milestones, today);
  const done = d.milestones.filter((m) => m.doneAt).length;
  const next = d.milestones.find((m) => !m.doneAt);
  const left = d.closeOn ? daysBetween(today, d.closeOn) : null;
  return (
    <li>
      <Link href={`/deals/${d.id}`} className="flex h-full flex-col gap-3 rounded-card bg-surface-2 p-5 transition duration-200 hover:bg-surface-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg">{d.contact.name}</p>
            <p className="truncate text-sm text-muted">{d.side === "buyer" ? "Buying" : "Selling"} · {d.address}</p>
          </div>
          <div className="shrink-0 text-right">
            <p>{money(d.price)}</p>
            <p className="text-sm text-muted">{left === null ? "No close date" : left < 0 ? "Close date passed" : left === 0 ? "Closes today" : `Closes in ${left}d`}</p>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-1" role="progressbar" aria-label="Milestones done" aria-valuenow={done} aria-valuemin={0} aria-valuemax={d.milestones.length}>
          <div className="h-full rounded-full bg-accent" style={{ width: `${d.milestones.length ? (done / d.milestones.length) * 100 : 0}%` }} />
        </div>
        <p className="text-sm text-muted">{done}/{d.milestones.length} done{next && <> · next: <span className="text-ink">{next.title}</span></>}</p>
        {flags[0] && (
          <p className={`flex items-start gap-1.5 text-sm ${flags[0].level === "high" ? "text-score-1" : "text-ink/80"}`}>
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{flags[0].text}{flags.length > 1 && <span className="text-muted"> · +{flags.length - 1} more</span>}</span>
          </p>
        )}
      </Link>
    </li>
  );
}
