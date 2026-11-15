import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar, Roll, Skeleton } from "@/components/ui";
import { money } from "@/lib/data";
import { addDays, closeOutlook, commission, daysBetween, pipelineByAgent, riskFlags } from "@/lib/deals";
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

  const rows = active
    .map((d) => ({ d, o: closeOutlook(flagsOf(d, today), d.milestones) }))
    .sort((a, b) => b.o.rank - a.o.rank || (a.d.closeOn ?? "9").localeCompare(b.d.closeOn ?? "9"));

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

      <dl className="grid gap-x-12 gap-y-5 rounded-card bg-surface-2 p-5 sm:grid-cols-[auto_auto_1fr] sm:p-6">
        <div>
          <dt className="text-sm text-muted">Pending, {share}</dt>
          <dd className="mt-1 text-4xl font-light tabular-nums"><Roll value={money(sum(active))} /></dd>
          <dd className="text-sm text-muted">{active.length} under contract · {money(active.reduce((n, d) => n + d.price, 0))} volume</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{isTeam ? "Closed" : "Earned"} in {today.slice(0, 4)}</dt>
          <dd className="mt-1 text-4xl font-light tabular-nums text-accent-ink"><Roll value={money(sum(closed))} /></dd>
          <dd className="text-sm text-muted">{closed.length} closed{isTeam ? ", team GCI" : ""}</dd>
        </div>
      </dl>

      {rows.length > 0 && <Runway rows={rows} today={today} />}

      <section aria-labelledby="active" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="active" className="text-xl">Under contract</h2>
          {rows.length > 1 && <p className="text-sm text-muted">Riskiest first</p>}
        </div>
        {rows.length === 0 ? <p className="rounded-card bg-surface-2 p-5 text-sm text-muted">Nothing under contract right now.</p> : (
          <ul className="flex flex-col divide-y divide-line/5 overflow-hidden rounded-card bg-surface-2">
            {rows.map(({ d, o }) => <DealRow key={d.id} d={d} o={o} today={today} />)}
          </ul>
        )}
      </section>

      {isTeam && (
        <section aria-labelledby="by-agent" className="flex flex-col gap-3">
          <h2 id="by-agent" className="text-xl">By agent</h2>
          <div className="overflow-x-auto rounded-card bg-surface-2 px-5" tabIndex={0} role="region" aria-label="Pipeline by agent">
            <table className="w-full min-w-[36rem] text-sm">
              <thead><tr className="border-b border-line/5 text-left text-muted">{["Agent", "Under contract", "Volume", "GCI", "Closing ≤30d", `Closed ${today.slice(0, 4)}`, "Brokerage share"].map((h, i) => <th key={h} scope="col" className={`py-2.5 font-normal ${i ? "px-3 text-right" : "pr-4"}`}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-line/5">
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

      {closed.length > 0 && (
        <section aria-labelledby="closed" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="closed" className="text-xl">Closed this year</h2>
            <p className="text-sm tabular-nums text-muted">{closed.length} · {money(closed.reduce((n, d) => n + d.price, 0))} volume</p>
          </div>
          <ul className="flex flex-col divide-y divide-line/5 overflow-hidden rounded-card bg-surface-2">
            {closed.map((d) => (
              <li key={d.id}>
                <Link href={`/deals/${d.id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 px-5 py-3 hover:bg-surface-3">
                  <span className="min-w-0"><span className="font-medium">{d.contact.name}</span> <span className="text-muted">· {d.address}</span></span>
                  <span className="text-sm tabular-nums text-muted">{money(d.price)} · {isTeam ? `GCI ${money(gci(d))}` : `you ${money(take(d))}`}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

type Outlook = ReturnType<typeof closeOutlook>;
type Row = { d: Deal; o: Outlook };

const flagsOf = (d: Deal, today: string) => riskFlags({ status: d.status, closeOn: d.closeOn, lastContactOn: d.contact.lastActivityAt?.slice(0, 10) ?? null }, d.milestones, today);
const TONE = ["text-accent-ink", "text-score-3", "text-score-1"] as const;
const RING = ["ring-accent", "ring-score-3", "ring-score-1"] as const;
const DOT = ["bg-accent", "bg-score-3", "bg-score-1"] as const;
const shortDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const SPAN = 60; // days shown on the runway

/**
 * The next 60 days as a track: today on the left, a mark each week, every deal at its closing date ringed in its
 * outlook colour. A date that has passed pins the deal to the left edge.
 */
function Runway({ rows, today }: { rows: Row[]; today: string }) {
  const placed = rows.filter((r) => r.d.closeOn).map((r) => ({ ...r, left: daysBetween(today, r.d.closeOn!) }));
  const shown = placed.filter((r) => r.left <= SPAN).sort((a, b) => a.left - b.left);
  const later = placed.length - shown.length;
  const undated = rows.length - placed.length;
  const at = (days: number) => `clamp(18px, ${(Math.max(0, days) / SPAN) * 100}%, calc(100% - 18px))`;
  return (
    <section aria-labelledby="runway" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="runway" className="text-xl">Closing runway</h2>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {(["On track", "Watch", "At risk"] as const).map((l, i) => <span key={l} className="flex items-center gap-1.5"><span aria-hidden className={`size-2 rounded-full ${DOT[i]}`} />{l}</span>)}
        </p>
      </div>
      <div className="rounded-card bg-surface-2 px-5 pt-4 pb-3 sm:px-6">
        <div className="relative h-14">
          <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-line/10" />
          {Array.from({ length: Math.floor(SPAN / 7) }, (_, i) => (i + 1) * 7).map((w) => (
            <span key={w} aria-hidden className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-line/15" style={{ left: `${(w / SPAN) * 100}%` }} />
          ))}
          <span aria-hidden className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-accent" />
          <ul aria-label="Deals by closing date">
            {shown.map(({ d, o, left }, i) => (
              // Deals closing within a few days of each other sit side by side so every face stays visible.
              <li key={d.id} className="absolute top-1/2" style={{ left: at(left), transform: `translate(calc(-50% + ${shown.slice(0, i).filter((x) => Math.abs(x.left - left) < 4).length * 30}px), -50%)` }}>
                <Link href={`/deals/${d.id}`} title={`${d.contact.name} · ${shortDate(d.closeOn!)} · ${o.label}`}
                  aria-label={`${d.contact.name}, closes ${shortDate(d.closeOn!)}${left < 0 ? ", date passed" : ""}, ${o.label}`}
                  className={`block rounded-full ring-2 ring-offset-2 ring-offset-surface-2 transition duration-150 hover:scale-110 ${RING[o.rank]}`}>
                  <Avatar name={d.contact.name} size={34} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div aria-hidden className="relative mt-1 h-4 text-[11px] text-muted">
          <span className="absolute left-0">Today</span>
          {[14, 28, 42].map((w) => <span key={w} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${(w / SPAN) * 100}%` }}>{shortDate(addDays(today, w))}</span>)}
          <span className="absolute right-0 tabular-nums">{shortDate(addDays(today, SPAN))}</span>
        </div>
        {(later > 0 || undated > 0) && (
          <p className="mt-2 text-xs text-muted">{[later > 0 && `${later} closing after ${shortDate(addDays(today, SPAN))}`, undated > 0 && `${undated} without a closing date`].filter(Boolean).join(" · ")}</p>
        )}
      </div>
    </section>
  );
}

/** One deal under contract: who and where, how it's going and why, checklist progress, price and days left. */
function DealRow({ d, o, today }: Row & { today: string }) {
  const done = d.milestones.filter((m) => m.doneAt).length;
  const next = d.milestones.find((m) => !m.doneAt);
  const left = d.closeOn ? daysBetween(today, d.closeOn) : null;
  return (
    <li>
      <Link href={`/deals/${d.id}`} className="flex items-center gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-3/60 sm:px-5">
        <span className={`shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-surface-2 ${RING[o.rank]}`}><Avatar name={d.contact.name} size={38} /></span>
        <span className="grid min-w-0 flex-1 gap-x-6 gap-y-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_9rem] md:items-center">
          <span className="min-w-0">
            <span className="block truncate font-medium">{d.contact.name}</span>
            <span className="block truncate text-sm text-muted">{d.side === "buyer" ? "Buying" : "Selling"} · {d.address}</span>
          </span>
          <span className="min-w-0 text-sm">
            <span className="block truncate"><span className={`font-medium ${TONE[o.rank]}`}>{o.label}</span> <span className="text-ink/80">· {o.why}</span></span>
            {d.milestones.length > 0 ? (
              <span className="mt-1 flex items-center gap-2 text-muted">
                <span className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-surface-1" role="progressbar" aria-label="Milestones done" aria-valuenow={done} aria-valuemin={0} aria-valuemax={d.milestones.length}>
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${(done / d.milestones.length) * 100}%` }} />
                </span>
                <span className="truncate">{done} of {d.milestones.length}{next && <> · next: {next.title}</>}</span>
              </span>
            ) : <span className="mt-0.5 block text-muted">No checklist yet</span>}
          </span>
          <span className="flex flex-wrap items-baseline gap-x-3 text-sm tabular-nums md:block md:text-right">
            <span className="block text-ink">{money(d.price)}</span>
            <span className={`block ${left !== null && left < 0 ? "text-score-1" : "text-muted"}`}>
              {left === null ? "No close date" : left < 0 ? "Date passed" : left === 0 ? "Closes today" : `${shortDate(d.closeOn!)} · ${left} day${left === 1 ? "" : "s"}`}
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}
