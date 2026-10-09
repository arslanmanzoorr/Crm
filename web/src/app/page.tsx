import type { Metadata } from "next";
import { Suspense } from "react";
import { Reveal, Skeleton, LoadingCards } from "@/components/ui";
import { Workspace } from "@/components/workspace";
import { CircleAlert, Flame } from "lucide-react";
import Link from "next/link";
import { riskFlags } from "@/lib/deals";
import { dbEnabled, getBuyingSignals, getLeadOptions, getMe, getPastClients, getShowings, getTasks, getTopLeads, listDeals } from "@/lib/db";
import { ShowingItem } from "@/components/showing-controls";
import { agenda } from "@/lib/retention";

export const metadata: Metadata = { title: "Workspace" };

export default function Home() {
  return (
    <Suspense fallback={<div role="status" aria-label="Loading your day" className="flex flex-col gap-10"><Skeleton className="h-14 rounded-full" /><Skeleton className="h-40" /><LoadingCards label="Loading leads" /></div>}>
      <Home_ />
    </Suspense>
  );
}

async function Home_() {
  const [me, top, tasks, options] = await Promise.all([getMe(), getTopLeads(), getTasks(), getLeadOptions()]);
  return (
    <Reveal>
      <Workspace name={me.name} leads={top.leads} total={top.total} tasks={tasks} options={options}
        extra={dbEnabled && (
          <>
            <Suspense fallback={<Skeleton className="h-32" />}><Signals /></Suspense>
            <Suspense fallback={<Skeleton className="h-32" />}><ShowingsSoon /></Suspense>
            <Suspense fallback={<Skeleton className="h-32" />}><DealsAtRisk /></Suspense>
            <Suspense fallback={<Skeleton className="h-32" />}><KeepInTouch /></Suspense>
          </>
        )} />
    </Reveal>
  );
}

/** Active deals with something overdue or about to slip, most urgent first. Quiet when everything is on track. */
async function DealsAtRisk() {
  const deals = await listDeals();
  const today = new Date().toISOString().slice(0, 10); // ponytail: UTC day, as on /deals
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
        <Link href="/deals" className="text-sm text-muted hover:text-accent">All deals</Link>
      </div>
      <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
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
  const today = new Date().toISOString().slice(0, 10);
  const due = agenda(clients, today, 0);
  if (due.length === 0) return null;
  return (
    <section aria-labelledby="keep-in-touch" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="keep-in-touch" className="text-xl">Keep in touch</h2>
        <Link href="/clients" className="text-sm text-muted hover:text-accent">All past clients</Link>
      </div>
      <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
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
        <Link href="/showings" className="text-sm text-muted hover:text-accent">All showings</Link>
      </div>
      <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
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
      <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
        {leads.map(([id, l]) => (
          <li key={id}>
            <Link href={`/leads/${id}`} className="flex min-h-14 items-start gap-3 px-4 py-3 hover:bg-surface-3 sm:px-5">
              <Flame aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" />
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
