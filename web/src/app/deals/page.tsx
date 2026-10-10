import { CircleAlert, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { money } from "@/lib/data";
import { commission, daysBetween, pipelineByAgent, riskFlags } from "@/lib/deals";
import { dbEnabled, getMembers, getOffices, listDeals, type Deal, teamToday } from "@/lib/db";

export const metadata: Metadata = { title: "Deals" };

export default function DealsPage({ searchParams }: PageProps<"/deals">) {
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
          <Board searchParams={searchParams} />
        </Suspense>
      ) : <p className="text-muted">Connect Supabase to track deals.</p>}
    </div>
  );
}

const take = (d: Deal) => commission(d.price, d.commissionPct, d.agentSplitPct, d.referralPct).agent;

const gci = (d: Deal) => commission(d.price, d.commissionPct, d.agentSplitPct, d.referralPct).gci;

/** "My deals" by default; "Whole team" is the brokerage view (everyone's pipeline, GCI, and a by-agent table). */
async function Board({ searchParams }: { searchParams: PageProps<"/deals">["searchParams"] }) {
  const [everything, team, offices, { who, office }] = await Promise.all([listDeals(), getMembers(), getOffices(), searchParams]);
  // Office filter (team view only): deals whose agent is in that office.
  const officeId = who === "team" && offices.some((o) => o.id === office) ? (office as string) : null;
  const inOffice = new Set(team.members.filter((m) => m.officeId === officeId).map((m) => m.userId));
  const all = officeId ? everything.filter((d) => d.ownerId && inOffice.has(d.ownerId)) : everything;
  const today = await teamToday();
  const others = everything.some((d) => d.ownerId !== team.me);
  const isTeam = who === "team" && others;
  const deals = isTeam || !others ? all : everything.filter((d) => d.ownerId === team.me);
  const active = deals.filter((d) => d.status === "active");
  const closed = deals.filter((d) => d.status === "closed");
  const soon = active.filter((d) => d.closeOn && daysBetween(today, d.closeOn) <= 30);
  const sum = (ds: Deal[]) => ds.reduce((n, d) => n + (isTeam ? gci(d) : take(d)), 0);
  const share = isTeam ? "team GCI" : "your share";
  const email = new Map(team.members.map((m) => [m.userId, m.email]));

  const tabs = others && (
    <nav aria-label="Whose deals" className="flex gap-2">
      {[["My deals", "/deals", !isTeam], ["Whole team", "/deals?who=team", isTeam]].map(([label, href, on]) => (
        <Link key={String(label)} href={String(href)} aria-current={on ? "page" : undefined}
          className={`flex min-h-10 items-center rounded-full px-4 text-sm ${on ? "bg-accent font-medium text-on-light" : "bg-surface-2 hover:bg-surface-3"}`}>{label}</Link>
      ))}
    </nav>
  );

  if (everything.length === 0)
    return (
      <div className="rounded-card bg-surface-2 p-8 text-center">
        <p className="text-lg">No deals yet</p>
        <p className="mt-1 text-muted">When an offer is accepted, open a deal from the client&apos;s page or here. You&apos;ll get a milestone checklist, deadline warnings and your commission.</p>
      </div>
    );

  return (
    <>
      {tabs}
      {isTeam && offices.length > 0 && (
        <nav aria-label="Office" className="flex flex-wrap gap-2">
          {[{ id: "", name: "All offices" }, ...offices].map((o) => (
            <Link key={o.id || "all"} href={`/deals?who=team${o.id ? `&office=${o.id}` : ""}`} aria-current={(officeId ?? "") === o.id ? "page" : undefined}
              className={`flex min-h-10 items-center rounded-full px-4 text-sm ${(officeId ?? "") === o.id ? "bg-surface-light font-medium text-on-light" : "bg-surface-2 hover:bg-surface-3"}`}>{o.name}</Link>
          ))}
        </nav>
      )}
      {isTeam && (
        <section aria-labelledby="by-agent" className="flex flex-col gap-3">
          <h2 id="by-agent" className="text-xl">By agent</h2>
          <div className="overflow-x-auto rounded-card bg-surface-2 px-5" tabIndex={0} role="region" aria-label="Pipeline by agent">
            <table className="w-full min-w-[36rem] text-sm">
              <thead><tr className="border-b border-white/5 text-left text-muted">{["Agent", "Under contract", "Volume", "GCI", "Closing ≤30d", `Closed ${today.slice(0, 4)}`, "Brokerage share"].map((h, i) => <th key={h} scope="col" className={`py-2.5 font-normal ${i ? "px-3 text-right" : "pr-4"}`}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-white/5">
                {pipelineByAgent(all, today).map((r) => (
                  <tr key={r.ownerId ?? "none"}>
                    <th scope="row" className="max-w-56 truncate py-2.5 pr-4 text-left font-normal">{r.ownerId ? email.get(r.ownerId) ?? "Former member" : "Unassigned"}</th>
                    {[r.active, money(r.volume), money(r.gci), r.soon, r.closed, money(r.brokerage)].map((v, i) => <td key={i} className="px-3 py-2.5 text-right tabular-nums">{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active deals" value={String(active.length)} />
        <Stat label="Closing in 30 days" value={money(sum(soon))} sub={`${soon.length} deal${soon.length === 1 ? "" : "s"}, ${share}`} />
        <Stat label={`Pending, ${share}`} value={money(sum(active))} />
        <Stat label={`${isTeam ? "Closed" : "Earned"} in ${today.slice(0, 4)}`} value={money(sum(closed))} sub={`${closed.length} closed${isTeam ? ", team GCI" : ""}`} accent />
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
                  <span className="text-sm text-muted">{money(d.price)} · {isTeam ? `GCI ${money(gci(d))}` : `you ${money(take(d))}`}</span>
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
