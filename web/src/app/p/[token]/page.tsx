import { CircleAlert, CircleCheck, Circle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LocalTime } from "@/components/local-time";
import { MatchReasons } from "@/components/match-reasons";
import { FavoriteButton, MessageAgent } from "@/components/portal-client";
import { Skeleton } from "@/components/ui";
import { money } from "@/lib/data";
import { supabase } from "@/lib/db";
import { daysBetween } from "@/lib/deals";
import { matchListing } from "@/lib/match";
import { FINANCING, type Financing as Fin } from "@/lib/offers";
import { DOC_SHORT, DOCS, LOAN_STAGES, type Doc, type LoanStage } from "@/lib/readiness";

export const metadata: Metadata = { title: "Your home journey", robots: { index: false, follow: false } };

type Portal = {
  first_name: string; type: string; team: string; agent_email: string | null;
  criteria: { budget: string; areas: string[]; preferences: string[] };
  showings: { starts_at: string; status: string; address: string }[];
  offers: { address: string; amount: number; status: string; updated: string | null }[];
  deals: { address: string; side: "buyer" | "seller"; status: string; close_on: string | null; milestones: { title: string; due_on: string | null; done: boolean }[] }[];
  financing: { cash: boolean; stage: LoanStage; preapproval_expires: string | null; docs: Doc[]; gift_funds: boolean } | null;
  favorites: string[];
  listings: { id: string; address: string; area: string; price: number; beds: number; baths: number; sqft: number; status: string; features: string[] }[];
  selling: {
    address: string; price: number; status: string; days_on_market: number; showings: number; open_house_visitors: number;
    feedback: { interest: string; rating: number | null; feedback: string; date: string }[];
    open_house_feedback: { rating: number | null; feedback: string; date: string }[];
    offers: { amount: number; financing: Fin; contingencies: number; close_on: string | null; status: string; seller_credit: number }[];
  }[];
};

export default function PortalPage({ params }: PageProps<"/p/[token]">) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-6">
      <Suspense fallback={<div className="flex flex-col gap-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>}>
        <Journey params={params} />
      </Suspense>
    </div>
  );
}

const fmtDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const OFFER_STATUS: Record<string, string> = { submitted: "Sent to the seller's agent", countered: "Countered, we're negotiating", accepted: "Accepted", rejected: "Not accepted", withdrawn: "Withdrawn" };
const INTEREST: Record<string, string> = { not_interested: "Not for them", maybe: "Maybe", interested: "Interested", offer: "Wants to make an offer" };

async function Journey({ params }: { params: PageProps<"/p/[token]">["params"] }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
  const { data } = await (await supabase()).rpc("portal_view", { p_token: token });
  const p = data as Portal | null;
  if (!p) return <Closed />;
  const today = new Date().toISOString().slice(0, 10);

  // What needs the client, most pressing first.
  const todo: string[] = [];
  const f = p.financing;
  if (f && !f.cash) {
    const missing = (Object.keys(DOCS) as Doc[]).filter((d) => (d !== "gift_letter" || f.gift_funds) && !f.docs.includes(d));
    if (missing.length) todo.push(`Send your lender: ${missing.map((d) => DOC_SHORT[d]).join(", ")}`);
    if (f.preapproval_expires && daysBetween(today, f.preapproval_expires) <= 14) todo.push("Your preapproval expires soon. Ask your lender to refresh it");
  }
  for (const o of p.offers) if (o.status === "countered") todo.push(`Your offer on ${o.address} was countered. Your agent will walk you through it`);
  for (const s of p.showings) if (s.status !== "done" && s.starts_at >= new Date().toISOString()) todo.push(`Showing at ${s.address}`);

  const activeDeal = p.deals.find((d) => d.status === "active");
  // Saved homes and homes that fit their search; if nothing fits yet, show what's available.
  const ranked = p.listings
    .map((l) => ({ l, m: matchListing({ type: p.type, ...p.criteria }, l), saved: p.favorites.includes(l.id) }))
    .sort((a, b) => Number(b.saved) - Number(a.saved) || (b.m?.score ?? -1) - (a.m?.score ?? -1));
  const fitting = ranked.filter((h) => h.saved || h.m);
  const homes = (fitting.length ? fitting : ranked).slice(0, 12);

  return (
    <>
      <header>
        <p className="text-sm text-muted">{p.team}</p>
        <h1 className="mt-1 text-4xl font-light">Hi {p.first_name}</h1>
        <p className="mt-1 text-muted">Everything on your home journey, in one place. This page is private to you; please don&apos;t share the link.</p>
      </header>

      <section aria-labelledby="next" className="flex flex-col gap-3 rounded-card bg-surface-2 p-5">
        <h2 id="next" className="text-xl">What&apos;s next for you</h2>
        {todo.length === 0 ? <p className="flex items-center gap-2 text-sm text-ink/80"><CircleCheck aria-hidden className="size-4 text-accent" /> Nothing needed from you right now.</p> : (
          <ul className="flex flex-col gap-2">{todo.map((t) => <li key={t} className="flex items-start gap-2 text-sm"><CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />{t}</li>)}</ul>
        )}
      </section>

      {activeDeal && (
        <section aria-labelledby="deal" className="flex flex-col gap-3">
          <h2 id="deal" className="text-xl">Your {activeDeal.side === "buyer" ? "purchase" : "sale"}: {activeDeal.address}</h2>
          {activeDeal.close_on && <p className="-mt-2 text-sm text-muted">Closing {fmtDate(activeDeal.close_on)}{daysBetween(today, activeDeal.close_on) >= 0 && ` · ${daysBetween(today, activeDeal.close_on)} days to go`}</p>}
          <ol className="flex flex-col gap-0 rounded-card bg-surface-2 p-5">
            {activeDeal.milestones.map((m) => (
              <li key={m.title} className="flex items-center gap-3 py-1.5 text-sm">
                {m.done ? <CircleCheck aria-hidden className="size-5 shrink-0 text-accent" /> : <Circle aria-hidden className="size-5 shrink-0 text-muted" />}
                <span className={`flex-1 ${m.done ? "text-muted" : ""}`}>{m.title}<span className="sr-only">{m.done ? " (done)" : " (to do)"}</span></span>
                {m.due_on && <span className={`text-xs ${!m.done && m.due_on < today ? "text-score-1" : "text-muted"}`}>{fmtDate(m.due_on)}</span>}
              </li>
            ))}
          </ol>
          {f && !f.cash && <p className="text-sm text-muted">Loan status: <span className="text-ink">{LOAN_STAGES[f.stage]}</span></p>}
        </section>
      )}

      {p.offers.length > 0 && (
        <section aria-labelledby="offers" className="flex flex-col gap-3">
          <h2 id="offers" className="text-xl">Your offers</h2>
          <ul className="flex flex-col divide-y divide-white/5 rounded-card bg-surface-2">
            {p.offers.map((o, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
                <span>{o.address} · {money(Number(o.amount))}</span>
                <span className={`text-sm ${o.status === "accepted" ? "text-accent" : "text-muted"}`}>{OFFER_STATUS[o.status] ?? o.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.showings.length > 0 && (
        <section aria-labelledby="showings" className="flex flex-col gap-3">
          <h2 id="showings" className="text-xl">Your showings</h2>
          <ul className="flex flex-col divide-y divide-white/5 rounded-card bg-surface-2">
            {p.showings.map((s, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
                <span>{s.address}</span>
                <span className="text-sm text-muted"><LocalTime ts={s.starts_at} opts={{ weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }} />{s.status === "done" ? " · seen" : s.status === "confirmed" ? " · confirmed" : " · requested"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.selling.map((s) => (
        <section key={s.address} aria-label={`Selling ${s.address}`} className="flex flex-col gap-3">
          <h2 className="text-xl">Selling {s.address}</h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Days on market", String(s.days_on_market)], ["Showings", String(s.showings)], ["Open house visitors", String(s.open_house_visitors)], ["Offers", String(s.offers.length)]].map(([k, v]) => (
              <div key={k} className="rounded-card bg-surface-2 p-4"><dt className="text-sm text-muted">{k}</dt><dd className="mt-1 text-2xl font-light">{v}</dd></div>
            ))}
          </dl>
          {s.offers.length > 0 && (
            <div className="overflow-x-auto rounded-card bg-surface-2 px-5" tabIndex={0} role="region" aria-label="Offers on your home">
              <table className="w-full min-w-[34rem] text-sm">
                <thead><tr className="border-b border-white/5 text-left text-muted"><th className="py-2.5 font-normal">Offer</th><th className="font-normal">Financing</th><th className="font-normal">Contingencies</th><th className="font-normal">Closing</th><th className="font-normal">Status</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {s.offers.map((o, i) => (
                    <tr key={i}><td className="py-2.5">{money(Number(o.amount))}{Number(o.seller_credit) > 0 && <span className="block text-xs text-muted">asks {money(Number(o.seller_credit))} credit</span>}</td><td>{FINANCING[o.financing]}</td><td>{o.contingencies}</td><td>{o.close_on ? fmtDate(o.close_on) : "–"}</td><td>{OFFER_STATUS[o.status] ?? o.status}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(s.feedback.length > 0 || s.open_house_feedback.length > 0) && (
            <div className="flex flex-col gap-2 rounded-card bg-surface-2 p-5">
              <h3 className="text-sm text-muted">What buyers said (names kept private)</h3>
              <ul className="flex flex-col gap-2 text-sm">
                {s.feedback.map((x, i) => <li key={`s${i}`}><span className="text-muted">{fmtDate(x.date)} · showing · {INTEREST[x.interest] ?? x.interest}{x.rating && ` · ${x.rating}/5`}</span>{x.feedback && <q className="block text-ink/90">{x.feedback}</q>}</li>)}
                {s.open_house_feedback.map((x, i) => <li key={`o${i}`}><span className="text-muted">{fmtDate(x.date)} · open house{x.rating && ` · ${x.rating}/5`}</span>{x.feedback && <q className="block text-ink/90">{x.feedback}</q>}</li>)}
              </ul>
            </div>
          )}
        </section>
      ))}

      {homes.length > 0 && (
        <section aria-labelledby="homes" className="flex flex-col gap-3">
          <h2 id="homes" className="text-xl">{fitting.length ? "Homes for you" : "Our listings"}</h2>
          <p className="-mt-2 text-sm text-muted">Tap the heart to save one; your agent sees what you like.</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {homes.map(({ l, m }) => (
              <li key={l.id} className="flex flex-col gap-2 rounded-card bg-surface-2 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg">{money(Number(l.price))}</p>
                    <p className="truncate">{l.address}</p>
                    <p className="text-sm text-muted">{[l.area, `${l.beds} bd`, `${Number(l.baths)} ba`, l.sqft ? `${l.sqft.toLocaleString()} sqft` : ""].filter(Boolean).join(" · ")}{l.status === "Coming soon" && " · Coming soon"}</p>
                  </div>
                  <FavoriteButton token={token} propertyId={l.id} on={p.favorites.includes(l.id)} address={l.address} />
                </div>
                {m && <MatchReasons m={m} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="contact" className="flex flex-col gap-3 rounded-card bg-surface-2 p-5">
        <h2 id="contact" className="text-xl">Questions?</h2>
        {p.agent_email && <p className="text-sm text-muted">Your agent: <a href={`mailto:${p.agent_email}`} className="text-ink hover:text-accent">{p.agent_email}</a></p>}
        <MessageAgent token={token} />
      </section>
      <p className="text-center text-xs text-muted">{p.team} · Powered by EstateOS</p>
    </>
  );
}

function Closed() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-3xl font-light">This link isn&apos;t active</h1>
      <p className="max-w-sm text-muted">It may have expired or been replaced. Ask your agent for a new one.</p>
    </div>
  );
}
