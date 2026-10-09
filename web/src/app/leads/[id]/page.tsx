import { FileSignature, Handshake, Mail, MessageSquare, Pencil, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActivityForm } from "@/components/activity-form";
import { AnalyzeButton, DeleteButton, StageSelect } from "@/components/lead-controls";
import { LocalTime } from "@/components/local-time";
import { PropertyCard } from "@/components/property-card";
import { TaskForm } from "@/components/task-form";
import { TaskList } from "@/components/tasks";
import { Chip, LeadAvatar, Reveal, ScoreDots, scoreLabel, Skeleton } from "@/components/ui";
import type { Lead } from "@/lib/data";
import { getDealsFor, getLead, getLeadOptions, getMembers, getOffers, getProperties, getReferrals, getShowings, getTasks } from "@/lib/db";
import { ScheduleShowing, ShowingItem } from "@/components/showing-controls";
import { ReferredBySelect } from "@/components/client-actions";
import { STATUS_LABEL } from "@/lib/offers";
import { money } from "@/lib/data";
import { matchListing, type Match } from "@/lib/match";
import { fmtDuration } from "@/lib/search";
import { OwnerSelect } from "@/components/owner-select";

export const metadata: Metadata = { title: "Lead" };

const contactBtn = "flex min-h-11 items-center gap-2 rounded-full bg-surface-light px-4 text-sm font-medium text-on-light hover:bg-white";
const blockedBtn = "flex min-h-11 cursor-not-allowed items-center gap-2 rounded-full bg-surface-2 px-4 text-sm text-muted";

export default function LeadPage({ params }: PageProps<"/leads/[id]">) {
  return (
    <Suspense fallback={<div role="status" aria-label="Loading lead" className="flex flex-col gap-8"><Skeleton className="h-24 max-w-md" /><div className="grid gap-6 lg:grid-cols-[1fr_380px]"><Skeleton className="h-80" /><Skeleton className="h-64" /></div></div>}>
      <LeadView params={params} />
    </Suspense>
  );
}

/** Why each channel is unavailable, in words an agent can act on. */
function blockers(lead: Lead) {
  const c = lead.consent ?? { sms: true, call: true, email: true, dnc: false };
  const why = (ok: boolean, has: string, what: string) =>
    c.dnc ? "marked do not contact" : !has ? `no ${what === "email" ? "email address" : "phone number"}` : !ok ? `no ${what} consent` : null;
  return {
    call: why(c.call, lead.phone, "call"),
    sms: why(c.sms, lead.phone, "SMS"),
    email: why(c.email, lead.email, "email"),
  };
}

async function LeadView({ params }: { params: PageProps<"/leads/[id]">["params"] }) {
  const lead = await getLead((await params).id);
  if (!lead) notFound();
  const [tasks, properties, team, deals, offers, refs, people, showings] = await Promise.all([getTasks(), getProperties(), getMembers(), getDealsFor(lead.id), getOffers({ contactId: lead.id }), getReferrals(lead.id), getLeadOptions(), getShowings({ contactId: lead.id })]);
  if (refs.referredBy && !people.some((p) => p.id === refs.referredBy!.id)) people.unshift(refs.referredBy); // keep the current referrer selectable
  const mine = tasks.filter((t) => t.contactId === lead.id);
  const matches = properties
    .map((p) => ({ p, m: matchListing(lead, p) }))
    .filter((x): x is { p: (typeof properties)[number]; m: Match } => x.m !== null)
    .sort((a, b) => b.m.score - a.m.score)
    .slice(0, 3);
  const b = blockers(lead);
  const blockedReasons = [...new Set([b.call, b.sms, b.email].filter(Boolean))];

  const channels = [
    { key: "call", label: "Call", icon: Phone, href: `tel:${lead.phone}`, why: b.call },
    { key: "sms", label: "Text", icon: MessageSquare, href: `sms:${lead.phone}`, why: b.sms },
    { key: "email", label: "Email", icon: Mail, href: `mailto:${lead.email}`, why: b.email },
  ];

  return (
    <Reveal>
      <div className="flex flex-col gap-8">
        <Link href="/leads" className="-my-2 flex min-h-11 w-fit items-center text-sm text-muted hover:text-accent">← All leads</Link>

        <header className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-5">
            <LeadAvatar id={lead.id} name={lead.name} size={80} />
            <div className="min-w-0">
              <h1 className="truncate text-4xl font-light">{lead.name}</h1>
              <p className="text-muted">{lead.headline}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="flex items-center gap-2"><ScoreDots score={lead.score} /> {scoreLabel(lead.score)} · {lead.score}</span>
                {lead.stage && <StageSelect id={lead.id} stage={lead.stage} />}
                {team.members.length > 0 && <OwnerSelect contactId={lead.id} ownerId={lead.ownerId ?? null} members={team.members} />}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <ResponseTime createdAt={lead.createdAt} firstResponseAt={lead.firstResponseAt} />
                {lead.tags?.map((t) => <Link key={t} href={`/leads?tag=${encodeURIComponent(t)}`} className="rounded-full bg-surface-3 px-3 py-1 text-xs hover:text-accent">#{t}</Link>)}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <div className="flex flex-wrap gap-2">
              {channels.map(({ key, label, icon: Icon, href, why }) =>
                why ? (
                  <button key={key} type="button" disabled aria-describedby="contact-blocked" className={blockedBtn}>
                    <Icon aria-hidden className="size-4" /> {label}
                  </button>
                ) : (
                  <a key={key} href={href} className={contactBtn}><Icon aria-hidden className="size-4" /> {label}</a>
                ),
              )}
              <Link href={`/leads/${lead.id}/edit`} className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-4 text-sm hover:bg-surface-3"><Pencil aria-hidden className="size-4" /> Edit</Link>
              <Link href={`/deals/new?contact=${lead.id}`} className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-4 text-sm hover:bg-surface-3"><Handshake aria-hidden className="size-4" /> Open deal</Link>
              {["buyer", "investor"].includes(lead.type ?? "") && <Link href={`/offers/new?contact=${lead.id}`} className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-4 text-sm hover:bg-surface-3"><FileSignature aria-hidden className="size-4" /> Write offer</Link>}
            </div>
            {blockedReasons.length > 0 && (
              <p id="contact-blocked" className="text-sm text-muted">
                Contact limited: {blockedReasons.join(", ")}.{" "}
                <Link href={`/leads/${lead.id}/edit`} className="text-accent underline">Update consent</Link>
              </p>
            )}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="flex min-w-0 flex-col gap-6">
            {["buyer", "investor", "renter"].includes(lead.type ?? "") && (
              <section aria-labelledby="showings" className="flex flex-col gap-3 rounded-card bg-surface-2 p-5 sm:p-6">
                <h2 id="showings" className="text-xl">Showings</h2>
                {showings.length > 0 && (
                  <ul className="-mx-5 flex flex-col divide-y divide-white/5 sm:-mx-6">
                    {showings.map((s) => <ShowingItem key={s.id} s={s} showBuyer={false} />)}
                  </ul>
                )}
                <details>
                  <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">Book a showing</summary>
                  <div className="mt-3"><ScheduleShowing contactId={lead.id} listings={properties.filter((p) => p.status !== "Sold").map(({ id, address }) => ({ id, address }))} /></div>
                </details>
              </section>
            )}
            <section aria-labelledby="tasks" className="rounded-card bg-surface-2 p-5 sm:p-6">
              <h2 id="tasks" className="mb-4 text-xl">Tasks</h2>
              <TaskForm contactId={lead.id} />
              <div className="mt-4"><TaskList tasks={mine} /></div>
            </section>

            <section aria-labelledby="timeline" className="rounded-card bg-surface-2 p-5 sm:p-6">
              <h2 id="timeline" className="mb-4 text-xl">Timeline</h2>
              <ActivityForm contactId={lead.id} />
              <ol className="flex flex-col gap-4">
                {lead.activity.map((a, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="w-24 shrink-0 pt-1 text-xs text-muted sm:w-28"><LocalTime ts={a.when} /></span>
                    <span className="flex min-w-0 flex-col items-start gap-1">
                      <Chip>{a.inbound ? `${a.channel} · from ${lead.name.split(" ")[0]}` : a.channel}</Chip>
                      <span className="text-sm break-words">{a.text}</span>
                    </span>
                  </li>
                ))}
                {lead.activity.length === 0 && <li className="text-sm text-muted">Nothing logged yet. Notes, calls and messages you log appear here.</li>}
              </ol>
            </section>
          </div>

          <aside className="flex flex-col gap-6">
            <section aria-labelledby="referrals" className="flex flex-col gap-2">
              <h2 id="referrals" className="text-xl">Referrals</h2>
              <div className="flex flex-col gap-3 rounded-card bg-surface-2 p-5 text-sm">
                <label className="flex flex-col gap-1.5">
                  <span className="text-muted">Referred by</span>
                  <ReferredBySelect contactId={lead.id} current={refs.referredBy?.id ?? ""} options={people} />
                </label>
                <div>
                  <p className="text-muted">Has referred</p>
                  {refs.referred.length === 0 ? <p>Nobody yet</p> : (
                    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{refs.referred.map((r) => <li key={r.id}><Link href={`/leads/${r.id}`} className="text-accent hover:underline">{r.name}</Link></li>)}</ul>
                  )}
                </div>
              </div>
            </section>
            {offers.length > 0 && (
              <section aria-labelledby="offers" className="flex flex-col gap-2">
                <h2 id="offers" className="text-xl">Offers</h2>
                <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
                  {offers.map((o) => (
                    <li key={o.id}>
                      <Link href={`/offers/${o.id}`} className="flex min-h-14 flex-col justify-center px-5 py-3 hover:bg-surface-3">
                        <span className="truncate">{o.address}</span>
                        <span className="text-sm text-muted">{STATUS_LABEL[o.status]} · {money(o.amount)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {deals.length > 0 && (
              <section aria-labelledby="deals" className="flex flex-col gap-2">
                <h2 id="deals" className="text-xl">Deals</h2>
                <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
                  {deals.map((d) => (
                    <li key={d.id}>
                      <Link href={`/deals/${d.id}`} className="flex min-h-14 flex-col justify-center px-5 py-3 hover:bg-surface-3">
                        <span className="truncate">{d.address}</span>
                        <span className="text-sm text-muted">
                          {d.status === "active" ? "Under contract" : d.status === "closed" ? "Closed" : "Fell through"} · {money(d.price)} · {d.milestones.filter((m) => m.doneAt).length}/{d.milestones.length} done
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section aria-labelledby="ai-profile" className="flex flex-col gap-4 rounded-card bg-surface-light p-5 text-on-light sm:p-6">
              <h2 id="ai-profile" className="text-2xl">AI profile</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-on-light/70">Intent</dt><dd>{lead.intent}</dd>
                {lead.nextAction && <><dt className="text-on-light/70">Next</dt><dd className="font-medium">{lead.nextAction}</dd></>}
                <dt className="text-on-light/70">Budget</dt><dd>{lead.budget || "—"}</dd>
                <dt className="text-on-light/70">Areas</dt><dd>{lead.areas.join(", ") || "—"}</dd>
                <dt className="text-on-light/70">Wants</dt><dd>{lead.preferences.join(", ") || "—"}</dd>
                <dt className="text-on-light/70">Source</dt><dd>{lead.sources.join(", ") || "—"}</dd>
              </dl>
              <AnalyzeButton id={lead.id} />
            </section>
            {matches.length > 0 && (
              <section aria-labelledby="matches" className="flex flex-col gap-3">
                <h2 id="matches" className="text-xl">Listings that fit</h2>
                {matches.map(({ p, m }) => <PropertyCard key={p.id} p={p} match={m} />)}
              </section>
            )}
            <div className="self-start"><DeleteButton id={lead.id} what="lead" /></div>
          </aside>
        </div>
      </div>
    </Reveal>
  );
}

/** Speed to lead: how long until the first call, text or email (notes don't count). */
function ResponseTime({ createdAt, firstResponseAt }: { createdAt?: string; firstResponseAt?: string | null }) {
  if (!createdAt) return null;
  if (firstResponseAt)
    return <span className="text-muted">First response in {fmtDuration(new Date(firstResponseAt).getTime() - new Date(createdAt).getTime())}</span>;
  return <span className="rounded-full bg-score-2/15 px-3 py-1 text-xs text-score-2">Not contacted yet</span>;
}
