import { Cake, HeartHandshake, MessageCircleHeart, Repeat, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckinButton, ReviewRequest, ReviewUrlForm, TestimonialForm } from "@/components/client-actions";
import { Chip, Skeleton } from "@/components/ui";
import { dbEnabled, getPastClients, teamToday } from "@/lib/db";
import { agenda, health, type Reminder } from "@/lib/retention";

export const metadata: Metadata = { title: "Past clients" };

export default function ClientsPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-4xl font-light">Past clients</h1>
        <p className="mt-1 text-muted">Stay in touch after closing. Referrals and repeat business come from here.</p>
      </header>
      {dbEnabled ? (
        <Suspense fallback={<div className="flex flex-col gap-4"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>}>
          <Clients />
        </Suspense>
      ) : <p className="text-muted">Connect Supabase to see past clients.</p>}
    </div>
  );
}

const ICON: Record<Reminder["kind"], typeof Cake> = { anniversary: Cake, checkin: HeartHandshake, review: Star, repeat: Repeat };
const HEALTH = { good: "In touch", due: "Check in soon", overdue: "Overdue" } as const;
const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

async function Clients() {
  const { clients, referrals, testimonials, reviewUrl, isAdmin } = await getPastClients();
  const today = await teamToday();
  const todo = agenda(clients, today);
  const byId = new Map(clients.map((c) => [c.contactId, c]));

  if (clients.length === 0)
    return (
      <div className="rounded-card bg-surface-2 p-8 text-center">
        <p className="text-lg">No past clients yet</p>
        <p className="mt-1 text-muted">When you mark a deal closed, the client shows up here with home anniversaries, check-in reminders and a review request.</p>
      </div>
    );

  return (
    <>
      <section aria-labelledby="todo" className="flex flex-col gap-3">
        <h2 id="todo" className="text-xl">Next two weeks <span className="text-muted">({todo.length})</span></h2>
        {todo.length === 0 ? <p className="rounded-card bg-surface-2 p-5 text-sm text-muted">Everyone&apos;s in touch. Nothing due in the next two weeks.</p> : (
          <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
            {todo.map((r) => {
              const Icon = ICON[r.kind];
              const c = byId.get(r.contactId)!;
              return (
                <li key={`${r.kind}-${r.contactId}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                  <Icon aria-hidden className="size-5 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1 basis-56">
                    <Link href={`/leads/${r.contactId}`} className="font-medium hover:text-accent">{r.name}</Link>
                    <p className="text-sm text-ink/80">{r.text}</p>
                    <p className="text-xs text-muted">{r.dueOn === today ? "Today" : fmt(r.dueOn)}</p>
                  </div>
                  {r.kind === "review"
                    ? <ReviewRequest dealId={r.dealId} firstName={r.name.split(" ")[0]} side={c.side} address={c.address} reviewUrl={reviewUrl} />
                    : <CheckinButton contactId={r.contactId} what={r.kind === "anniversary" ? "Home anniversary check-in" : r.kind === "repeat" ? "Asked about their plans" : "Checked in"} />}
                </li>
              );
            })}
          </ul>
        )}
        {!reviewUrl && todo.some((r) => r.kind === "review") && (
          <p className="text-sm text-muted">{isAdmin ? "Add your review link below so requests include it." : "Ask an owner or admin to add the team's review link."}</p>
        )}
      </section>

      <section aria-labelledby="all" className="flex flex-col gap-3">
        <h2 id="all" className="text-xl">Everyone <span className="text-muted">({clients.length})</span></h2>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((c) => {
            const h = health(c, today);
            const years = Math.floor((Date.parse(today) - Date.parse(c.closedOn)) / (365.25 * 86_400_000));
            return (
              <li key={c.contactId}>
                <Link href={`/leads/${c.contactId}`} className="flex h-full flex-col gap-2 rounded-card bg-surface-2 p-5 hover:bg-surface-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate text-lg">{c.name}</p>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${h.health === "good" ? "bg-accent text-on-light" : h.health === "due" ? "bg-surface-light text-on-light" : "bg-score-1 text-on-light"}`}>{HEALTH[h.health]}</span>
                  </div>
                  <p className="truncate text-sm text-muted">{c.side === "buyer" ? "Bought" : "Sold"} {c.address}</p>
                  <p className="text-sm">Closed {fmt(c.closedOn)}{years >= 1 && <span className="text-muted"> · {years} yr{years === 1 ? "" : "s"}</span>}</p>
                  <p className="text-sm text-muted">Last contact {h.daysSinceTouch === 0 ? "today" : `${h.daysSinceTouch} days ago`}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                    {referrals[c.contactId] > 0 && <Chip tone="accent">{referrals[c.contactId]} referral{referrals[c.contactId] === 1 ? "" : "s"}</Chip>}
                    {c.hasTestimonial && <Chip>Testimonial</Chip>}
                    {c.reviewAskedOn && !c.hasTestimonial && <Chip>Review asked</Chip>}
                    {c.activeDeal && <Chip tone="accent">In a new deal</Chip>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="testimonials" className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 id="testimonials" className="text-xl">Testimonials</h2>
          {testimonials.length === 0 ? <p className="text-sm text-muted">None yet. When a client sends kind words, save them here, with their OK to publish.</p> : (
            <ul className="flex flex-col gap-3">
              {testimonials.map((t) => (
                <li key={t.id} className="rounded-card bg-surface-2 p-5">
                  <MessageCircleHeart aria-hidden className="mb-2 size-5 text-accent" />
                  <blockquote className="text-ink/90">{t.body}</blockquote>
                  <p className="mt-2 text-sm text-muted">
                    {t.name}{t.rating && <> · <span role="img" aria-label={`${t.rating} out of 5 stars`}>{"★".repeat(t.rating)}</span></>} · {fmt(t.receivedOn)} · {t.publishOk ? <span className="text-accent">OK to publish</span> : "Private, no consent to publish"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-6">
          <div className="rounded-card bg-surface-2 p-5">
            <h3 className="mb-3 text-lg">Add a testimonial</h3>
            <TestimonialForm clients={clients.map(({ contactId, dealId, name }) => ({ contactId, dealId, name }))} />
          </div>
          {isAdmin && (
            <div className="rounded-card bg-surface-2 p-5">
              <h3 className="text-lg">Review link</h3>
              <p className="mb-3 text-sm text-muted">Where clients leave reviews (Google, Zillow…). Review requests include it.</p>
              <ReviewUrlForm current={reviewUrl} />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
