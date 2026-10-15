import type { Metadata } from "next";
import { Fragment, Suspense, type ReactNode } from "react";
import { PlanMyDay } from "@/components/plan-my-day";
import { Reveal, Skeleton, LoadingCards } from "@/components/ui";
import { Workspace } from "@/components/workspace";
import { HomeCustomize } from "@/components/home-customize";
import { TopLeads } from "@/components/leads";
import { DayTasks } from "@/components/tasks";
import { Today } from "@/components/today";
import type { Section } from "@/lib/features";
import { CircleAlert, Flame, TrendingDown } from "lucide-react";
import Link from "next/link";
import { daysBetween } from "@/lib/deals";
import { riskFlags } from "@/lib/deals";
import { dbEnabled, getAppBrand, getHomeLayout, isOwnerOrAdmin, getBuyingSignals, getLeadOptions, getProperties, getMe, getSavedPriceDrops, getPastClients, getShowings, getSoonMovers, getTasks, getTopLeads, listDeals, teamToday } from "@/lib/db";
import { ShowingItem } from "@/components/showing-controls";
import { agenda } from "@/lib/retention";
import { money } from "@/lib/data";

export const metadata: Metadata = { title: "Workspace" };

export default function Home() {
  return (
    <Suspense fallback={<div role="status" aria-label="Loading your day" className="flex flex-col gap-10"><Skeleton className="h-14 rounded-full" /><Skeleton className="h-40" /><LoadingCards label="Loading leads" /></div>}>
      <Home_ />
    </Suspense>
  );
}

async function Home_() {
  const [me, top, tasks, options, soon, brand] = await Promise.all([getMe(), getTopLeads(), getTasks(), getLeadOptions(), getSoonMovers(), getAppBrand()]);
  const layout = await getHomeLayout(brand?.off ?? []);
  const db = (node: ReactNode) => (dbEnabled ? node : null);
  const blocks: Record<Section, ReactNode> = {
    today: <Today leads={[...top.leads, ...soon.filter((s) => !top.leads.some((l) => l.id === s.id))]} tasks={tasks} />,
    plan: db(<Suspense fallback={null}><Plan /></Suspense>),
    signals: db(<Suspense fallback={<Skeleton className="h-32" />}><Signals /></Suspense>),
    drops: db(<Suspense fallback={null}><SavedDrops /></Suspense>),
    showings: db(<Suspense fallback={<Skeleton className="h-32" />}><ShowingsSoon /></Suspense>),
    deals: db(<Suspense fallback={<Skeleton className="h-32" />}><DealsAtRisk /></Suspense>),
    expiring: db(<Suspense fallback={<Skeleton className="h-32" />}><ExpiringListings /></Suspense>),
    keep: db(<Suspense fallback={<Skeleton className="h-32" />}><KeepInTouch /></Suspense>),
    leads: <TopLeads leads={top.leads} total={top.total} />,
    tasks: <DayTasks tasks={tasks} leads={options} />,
  };
  return (
    <Reveal>
      <Workspace name={me.name} tasks={tasks}>
        {layout.order.filter((k) => !layout.hidden.includes(k)).map((k) => <Fragment key={k}>{blocks[k]}</Fragment>)}
        {dbEnabled && <HomeCustomize order={layout.order} hidden={layout.hidden} own={layout.own} canTeam={await isOwnerOrAdmin()} />}
      </Workspace>
    </Reveal>
  );
}

/** Compact facts for the AI day plan: open tasks due by tomorrow, hot leads, showings and deals at risk. */
async function Plan() {
  const [tasks, top, deals, today] = await Promise.all([getTasks(), getTopLeads(8), listDeals(), teamToday()]);
  const now = new Date().getTime();
  const showings = await getShowings({ from: new Date(now).toISOString(), to: new Date(now + 86_400_000).toISOString() });
  const data = {
    today,
    tasks: tasks.filter((t) => !t.done && t.dueAt && Date.parse(t.dueAt) < now + 86_400_000).slice(0, 15)
      .map((t) => ({ title: t.title, kind: t.kind, lead: t.contact, overdue: Date.parse(t.dueAt!) < now, canCall: !!t.phone, canEmail: !!t.email })),
    hotLeads: top.leads.filter((l) => !["Closed", "Lost"].includes(l.stage ?? "")).slice(0, 6)
      .map((l) => ({ name: l.name, score: l.score, stage: l.stage, next: l.nextAction, consent: l.consent && { call: l.consent.call, text: l.consent.sms, email: l.consent.email, dnc: l.consent.dnc } })),
    showings: showings.filter((s) => s.status === "requested" || s.status === "confirmed").map((s) => ({ at: s.startsAt, address: s.address, buyer: s.contact.name, status: s.status })),
    dealsAtRisk: deals.filter((d) => d.status === "active").map((d) => ({ client: d.contact.name, address: d.address, flags: riskFlags({ status: d.status, closeOn: d.closeOn, lastContactOn: d.contact.lastActivityAt?.slice(0, 10) ?? null }, d.milestones, today).map((f) => f.text) }))
      .filter((d) => d.flags.length).slice(0, 5),
  };
  if (!data.tasks.length && !data.hotLeads.length && !data.showings.length && !data.dealsAtRisk.length) return null;
  return <PlanMyDay data={data} />;
}

/** Active deals with something overdue or about to slip, most urgent first. Quiet when everything is on track. */
async function DealsAtRisk() {
  const deals = await listDeals();
  const today = await teamToday();
  const atRisk = deals
    .filter((d) => d.status === "active")
    .map((d) => ({ d, flags: riskFlags({ status: d.status, closeOn: d.closeOn, lastContactOn: d.contact.lastActivityAt?.slice(0, 10) ?? null }, d.milestones, today) }))
    .filter((x) => x.flags.length > 0)
    .sort((a, b) => b.flags.filter((f) => f.level === "high").length - a.flags.filter((f) => f.level === "high").length);
  if (atRisk.length === 0) return null;
  return (
    <section aria-labelledby="deals-risk" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="deals-risk" className="text-xl">Deals that need you</h2>
        <Link href="/deals" className="text-sm text-muted hover:text-accent-ink">All deals</Link>
      </div>
      <ul className="flex flex-col divide-y divide-line/5 overflow-hidden rounded-card bg-surface-2">
        {atRisk.slice(0, 4).map(({ d, flags }) => (
          <li key={d.id}>
            <Link href={`/deals/${d.id}`} className="flex min-h-14 items-start gap-3 px-4 py-3 hover:bg-surface-3 sm:px-5">
              <CircleAlert aria-hidden className={`mt-0.5 size-5 shrink-0 ${flags[0].level === "high" ? "text-score-1" : "text-muted"}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{d.contact.name} <span className="font-normal text-muted">· {d.address}</span></span>
                <span className="block text-sm text-ink/80">{flags[0].text}{flags.length > 1 && <span className="text-muted"> · +{flags.length - 1} more</span>}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Past clients due a touch today (anniversaries, check-ins, review asks). Quiet when nothing is due. */
async function KeepInTouch() {
  const { clients } = await getPastClients();
  const today = await teamToday();
  const due = agenda(clients, today, 0);
  if (due.length === 0) return null;
  return (
    <section aria-labelledby="keep-in-touch" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="keep-in-touch" className="text-xl">Keep in touch</h2>
        <Link href="/clients" className="text-sm text-muted hover:text-accent-ink">All past clients</Link>
      </div>
      <ul className="flex flex-col divide-y divide-line/5 overflow-hidden rounded-card bg-surface-2">
        {due.slice(0, 4).map((r) => (
          <li key={`${r.kind}-${r.contactId}`}>
            <Link href="/clients" className="flex min-h-14 flex-col justify-center px-4 py-3 hover:bg-surface-3 sm:px-5">
              <span className="font-medium">{r.name}</span>
              <span className="text-sm text-ink/80">{r.text}</span>
            </Link>
          </li>
        ))}
      </ul>
      {due.length > 4 && <p className="-mt-2 text-sm text-muted">+{due.length - 4} more on Past clients</p>}
    </section>
  );
}

/** Showings in the next 24 hours, with confirm/copy/calendar actions inline. Quiet when there are none. */
async function ShowingsSoon() {
  const now = new Date().getTime();
  const list = (await getShowings({ from: new Date(now - 3_600_000).toISOString(), to: new Date(now + 86_400_000).toISOString() }))
    .filter((s) => s.status === "requested" || s.status === "confirmed");
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="showings-soon" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="showings-soon" className="text-xl">Showings, next 24 hours</h2>
        <Link href="/showings" className="text-sm text-muted hover:text-accent-ink">All showings</Link>
      </div>
      <ul className="flex flex-col divide-y divide-line/5 overflow-hidden rounded-card bg-surface-2">
        {list.map((s) => <ShowingItem key={s.id} s={s} />)}
      </ul>
    </section>
  );
}

/** Leads warming up right now, strongest first, each with the reasons. Quiet when there are none. */
async function Signals() {
  const all = await getBuyingSignals();
  if (all.length === 0) return null;
  const byLead = new Map<string, { name: string; strength: number; reasons: string[] }>();
  for (const s of all) {
    const e = byLead.get(s.contactId) ?? { name: s.name, strength: 0, reasons: [] };
    e.strength += s.strength;
    e.reasons.push(s.signal);
    byLead.set(s.contactId, e);
  }
  const leads = [...byLead].sort((a, b) => b[1].strength - a[1].strength).slice(0, 5);
  return (
    <section aria-labelledby="signals" className="flex flex-col gap-4">
      <h2 id="signals" className="text-xl">Buying signals</h2>
      <ul className="flex flex-col divide-y divide-line/5 overflow-hidden rounded-card bg-surface-2">
        {leads.map(([id, l]) => (
          <li key={id}>
            <Link href={`/leads/${id}`} className="flex min-h-14 items-start gap-3 px-4 py-3 hover:bg-surface-3 sm:px-5">
              <Flame aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-ink" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{l.name}</span>
                <span className="block text-sm text-ink/80">{l.reasons.join(" · ")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Homes a client saved that just dropped in price. Quiet when there are none. */
async function SavedDrops() {
  const drops = await getSavedPriceDrops();
  if (drops.length === 0) return null;
  return (
    <section aria-labelledby="drops" className="flex flex-col gap-4">
      <h2 id="drops" className="text-xl">Price cuts on saved homes</h2>
      <ul className="flex flex-col divide-y divide-line/5 overflow-hidden rounded-card bg-surface-2">
        {drops.slice(0, 6).map((d) => (
          <li key={d.contactId + d.propertyId}>
            <Link href={`/leads/${d.contactId}`} className="flex min-h-14 items-start gap-3 px-4 py-3 hover:bg-surface-3 sm:px-5">
              <TrendingDown aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-ink" />
              <span className="min-w-0 flex-1">
                <span className="block truncate"><span className="font-medium">{d.name}</span> <span className="text-muted">saved {d.address}</span></span>
                <span className="block text-sm text-ink/80">Now {money(d.to)}, down {money(d.from - d.to)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Listing agreements ending within 30 days (or already ended): time to renew or reprice. */
async function ExpiringListings() {
  const listings = await getProperties();
  const now = new Date().getTime();
  const soon = listings
    .filter((p) => p.listingExpires && p.status !== "Sold")
    .map((p) => ({ p, left: daysBetween(new Date(now).toISOString().slice(0, 10), p.listingExpires!) }))
    .filter((x) => x.left <= 30)
    .sort((a, b) => a.left - b.left);
  if (soon.length === 0) return null;
  return (
    <section aria-labelledby="expiring" className="flex flex-col gap-4">
      <h2 id="expiring" className="text-xl">Listing agreements ending</h2>
      <ul className="flex flex-col divide-y divide-line/5 overflow-hidden rounded-card bg-surface-2">
        {soon.map(({ p, left }) => (
          <li key={p.id}>
            <Link href={`/properties/${p.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-surface-3 sm:px-5">
              <span className="truncate font-medium">{p.address}</span>
              <span className={`shrink-0 text-sm ${left <= 7 ? "text-score-1" : "text-muted"}`}>{left < 0 ? `Ended ${-left} days ago` : left === 0 ? "Ends today" : `Ends in ${left} days`}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
