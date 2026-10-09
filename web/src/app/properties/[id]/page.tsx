import type { Metadata } from "next";
import { Calculator, ChartNoAxesCombined, Clapperboard, Pencil, Printer, Send, TrendingUp } from "lucide-react";
import { createCmaFromListing } from "@/lib/actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/lead-controls";
import { PhotoManager } from "@/components/photo-manager";
import { Chip, Skeleton } from "@/components/ui";
import { money } from "@/lib/data";
import { MatchReasons } from "@/components/match-reasons";
import type { Property } from "@/lib/data";
import QRCode from "qrcode";
import { LocalTime } from "@/components/local-time";
import { CopyLink, DeleteOpenHouse, ScheduleOpenHouse } from "@/components/open-house-controls";
import { dbEnabled, getLeadOptions, getOffers, getOpenBuyers, getOpenHouses, getProperty, getShowings, type OpenHouse } from "@/lib/db";
import { ScheduleShowing, ShowingItem } from "@/components/showing-controls";
import { compareOffers, CONTINGENCIES, FINANCING, netOf, STATUS_LABEL } from "@/lib/offers";
import { matchListing } from "@/lib/match";

export const metadata: Metadata = { title: "Listing" };

export default function PropertyPage({ params }: PageProps<"/properties/[id]">) {
  return (
    <Suspense fallback={<div role="status" aria-label="Loading listing" className="flex flex-col gap-6"><Skeleton className="aspect-[21/9]" /><Skeleton className="h-16 max-w-lg" /></div>}>
      <Listing params={params} />
    </Suspense>
  );
}

async function Listing({ params }: { params: PageProps<"/properties/[id]">["params"] }) {
  const p = await getProperty((await params).id);
  if (!p) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/properties" className="-my-2 flex min-h-11 w-fit items-center text-sm text-muted hover:text-accent">← All listings</Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-light">{p.address}</h1>
          <p className="text-muted">{p.area} · {p.status}</p>
        </div>
        <span className="text-4xl font-light text-accent sm:text-5xl">{money(p.price)}</span>
      </header>
      <div className="flex flex-wrap gap-2">
        <Chip>{p.beds} beds</Chip>
        <Chip>{p.baths} baths</Chip>
        <Chip>{p.sqft.toLocaleString()} sqft</Chip>
        {p.features.map((f) => <Chip key={f}>{f}</Chip>)}
      </div>
      {p.description && <p className="max-w-2xl text-ink/80">{p.description}</p>}
      <div className="flex flex-wrap gap-2">
        <Link href={`/studio?property=${p.id}`} className="flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 font-medium text-on-light hover:bg-accent-strong">
          <Clapperboard aria-hidden className="size-4" /> Make video
        </Link>
        <Link href={`/publish?property=${p.id}`} className="flex min-h-11 items-center gap-2 rounded-full bg-surface-light px-5 font-medium text-on-light hover:bg-white">
          <Send aria-hidden className="size-4" /> Post to socials
        </Link>
        <form action={createCmaFromListing} className="contents">
          <input type="hidden" name="property_id" value={p.id} />
          <button className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-5 hover:bg-surface-3"><ChartNoAxesCombined aria-hidden className="size-4" /> CMA</button>
        </form>
        <Link href={`/tools?tab=payment&price=${p.price}`} className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-5 hover:bg-surface-3">
          <Calculator aria-hidden className="size-4" /> Payment
        </Link>
        <Link href={`/tools?tab=invest&price=${p.price}`} className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-5 hover:bg-surface-3">
          <TrendingUp aria-hidden className="size-4" /> Rental numbers
        </Link>
        <Link href={`/properties/${p.id}/edit`} className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-5 hover:bg-surface-3">
          <Pencil aria-hidden className="size-4" /> Edit
        </Link>
      </div>
      {dbEnabled ? <PhotoManager propertyId={p.id} photos={p.photos ?? []} /> : <div className={`aspect-[21/9] rounded-card bg-gradient-to-br ${p.tone}`} />}
      <Suspense fallback={<Skeleton className="h-40 max-w-2xl" />}>
        <Buyers p={p} />
      </Suspense>
      {dbEnabled && (
        <Suspense fallback={<Skeleton className="h-40 max-w-2xl" />}>
          <Offers p={p} />
        </Suspense>
      )}
      {dbEnabled && (
        <Suspense fallback={<Skeleton className="h-40 max-w-2xl" />}>
          <Showings p={p} />
        </Suspense>
      )}
      {dbEnabled && (
        <Suspense fallback={<Skeleton className="h-40 max-w-2xl" />}>
          <OpenHouses propertyId={p.id} />
        </Suspense>
      )}
      <div className="self-start"><DeleteButton id={p.id} what="listing" /></div>
    </div>
  );
}

/** Instant Buyer Matching: open buyers ranked by how well this listing fits what they asked for. */
async function Buyers({ p }: { p: Property }) {
  const ranked = (await getOpenBuyers())
    .map((b) => ({ b, m: matchListing(b, p) }))
    .filter((x) => x.m !== null)
    .sort((x, y) => y.m!.score - x.m!.score || y.b.score - x.b.score);
  return (
    <section aria-labelledby="buyers" className="flex max-w-2xl flex-col gap-3">
      <h2 id="buyers" className="text-xl">Buyers who fit {ranked.length > 0 && <span className="text-muted">({ranked.length})</span>}</h2>
      {ranked.length === 0 ? (
        <p className="text-sm text-muted">No open buyer has this area and price in their search yet.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
          {ranked.slice(0, 8).map(({ b, m }) => (
            <li key={b.id}>
              <Link href={`/leads/${b.id}`} className="flex min-h-14 flex-col gap-1.5 px-5 py-3 hover:bg-surface-3">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-medium">{b.name}</span>
                  <span className="shrink-0 text-sm text-muted">{m!.score}% fit{b.budget && ` · ${b.budget}`}</span>
                </span>
                <MatchReasons m={m!} />
              </Link>
            </li>
          ))}
        </ol>
      )}
      {ranked.length > 8 && <p className="text-sm text-muted">Showing the 8 best of {ranked.length}.</p>}
    </section>
  );
}

/** Open houses: schedule, a QR code and link for sign-in, and what visitors said (the seller report). */
async function OpenHouses({ propertyId }: { propertyId: string }) {
  const list = await getOpenHouses(propertyId);
  return (
    <section aria-labelledby="open-houses" className="flex max-w-2xl flex-col gap-3">
      <h2 id="open-houses" className="text-xl">Open houses</h2>
      <ScheduleOpenHouse propertyId={propertyId} />
      {list.length === 0 && <p className="text-sm text-muted">Schedule one to get a sign-in QR code for the door.</p>}
      {await Promise.all(list.map(async (o) => <OpenHouseCard key={o.id} o={o} propertyId={propertyId} />))}
    </section>
  );
}

async function OpenHouseCard({ o, propertyId }: { o: OpenHouse; propertyId: string }) {
  const url = `${process.env.SITE_URL ?? ""}/oh/${o.id}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0a0a0a", light: "#ffffff" } });
  const rated = o.visits.filter((v) => v.rating !== null);
  const avg = rated.length ? (rated.reduce((n, v) => n + v.rating!, 0) / rated.length).toFixed(1) : null;
  const unrepresented = o.visits.filter((v) => !v.hasAgent).length;
  const said = o.visits.filter((v) => v.feedback);
  return (
    <article className="flex flex-col gap-4 rounded-card bg-surface-2 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-medium"><LocalTime ts={o.startsAt} opts={{ weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }} /> – <LocalTime ts={o.endsAt} opts={{ hour: "numeric", minute: "2-digit" }} /></h3>
          <p className="text-sm text-muted">
            {o.visits.length} visitor{o.visits.length === 1 ? "" : "s"}
            {o.visits.length > 0 && ` · ${unrepresented} without an agent`}
            {avg && ` · rated ${avg}/5`}
          </p>
        </div>
        <a href={`/oh/${o.id}`} target="_blank" rel="noopener" aria-label="Open the sign-in page"
          className="size-28 shrink-0 overflow-hidden rounded-lg bg-white p-1 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyLink url={url} />
        <a href={`/oh/${o.id}/poster`} target="_blank" rel="noopener" className="flex min-h-11 items-center gap-2 rounded-full bg-surface-3 px-4 text-sm hover:bg-surface-1">
          <Printer aria-hidden className="size-4" /> Door poster
        </a>
        <DeleteOpenHouse id={o.id} propertyId={propertyId} visits={o.visits.length} />
      </div>
      {o.visits.length > 0 && (
        <details className="group">
          <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">Seller report: who came and what they said</summary>
          <ul className="mt-2 flex flex-col divide-y divide-white/5 text-sm">
            {o.visits.map((v, i) => (
              <li key={`${v.contactId}-${i}`} className="flex flex-col gap-1 py-2">
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/leads/${v.contactId}`} className="font-medium hover:text-accent">{v.name}</Link>
                  <span className="text-muted">{v.hasAgent ? "Has an agent" : "No agent"}{v.rating !== null && ` · ${v.rating}/5`}</span>
                </span>
                {v.feedback && <q className="text-ink/80">{v.feedback}</q>}
              </li>
            ))}
          </ul>
          {said.length === 0 && <p className="text-sm text-muted">No written feedback yet.</p>}
        </details>
      )}
    </article>
  );
}

/** Offers received on this listing, side by side, with what makes each one stand out. */
async function Offers({ p }: { p: Property }) {
  const offers = (await getOffers({ propertyId: p.id })).filter((o) => o.side === "seller");
  const strengths = compareOffers(offers);
  return (
    <section aria-labelledby="offers" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="offers" className="text-xl">Offers {offers.length > 0 && <span className="text-muted">({offers.length})</span>}</h2>
        <Link href={`/offers/new?property=${p.id}`} className="flex min-h-11 items-center rounded-full bg-surface-2 px-4 text-sm hover:bg-surface-3">Record an offer</Link>
      </div>
      {offers.length === 0 ? (
        <p className="text-sm text-muted">When offers come in, record them here to compare price, net, financing and contingencies side by side.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {offers.map((o) => {
            const dead = o.status === "rejected" || o.status === "withdrawn";
            return (
              <li key={o.id}>
                <Link href={`/offers/${o.id}`} className={`flex h-full flex-col gap-3 rounded-card bg-surface-2 p-5 hover:bg-surface-3 ${dead ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate">{o.buyerName || "Unnamed buyer"}</p>
                      <p className="text-sm text-muted">{STATUS_LABEL[o.status]}</p>
                    </div>
                    <p className="shrink-0 text-xl">{money(o.amount)}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted">Net of credits</dt><dd className="text-right">{money(netOf(o))}</dd>
                    <dt className="text-muted">vs. list price</dt><dd className="text-right">{o.amount >= p.price ? "+" : "−"}{money(Math.abs(o.amount - p.price))}</dd>
                    <dt className="text-muted">Financing</dt><dd className="text-right">{FINANCING[o.financing]}</dd>
                    <dt className="text-muted">Earnest</dt><dd className="text-right">{o.earnest ? money(o.earnest) : "None"}</dd>
                    <dt className="text-muted">Closing</dt><dd className="text-right">{o.closeOn ?? "Not set"}</dd>
                    <dt className="text-muted">Contingencies</dt><dd className="text-right">{o.contingencies.length ? o.contingencies.map((c) => CONTINGENCIES[c]).join(", ") : "None"}</dd>
                  </dl>
                  {strengths[o.id].length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">{strengths[o.id].map((s) => <li key={s}><Chip tone="accent">{s}</Chip></li>)}</ul>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const INTEREST_WORD = { not_interested: "Not for them", maybe: "Maybe", interested: "Interested", offer: "Wants to offer" } as const;

/** Showings on this listing: what's booked, and what buyers thought (part of the seller report). */
async function Showings({ p }: { p: Property }) {
  const [list, buyers] = await Promise.all([getShowings({ propertyId: p.id }), getLeadOptions()]);
  const now = new Date().getTime();
  const upcoming = list.filter((s) => Date.parse(s.endsAt) >= now && (s.status === "requested" || s.status === "confirmed"));
  const heard = list.filter((s) => s.interest).reverse();
  const tally = Object.fromEntries(Object.keys(INTEREST_WORD).map((k) => [k, heard.filter((s) => s.interest === k).length])) as Record<keyof typeof INTEREST_WORD, number>;
  return (
    <section aria-labelledby="showings" className="flex max-w-2xl flex-col gap-3">
      <h2 id="showings" className="text-xl">Showings {list.length > 0 && <span className="text-muted">({list.filter((s) => s.status !== "cancelled").length})</span>}</h2>
      {p.showingNotes && <p className="text-sm text-ink/80">Instructions: {p.showingNotes}</p>}
      {upcoming.length > 0 && (
        <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
          {upcoming.map((s) => <ShowingItem key={s.id} s={s} />)}
        </ul>
      )}
      {heard.length > 0 && (
        <details className="rounded-card bg-surface-2 p-5">
          <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">
            Seller report: {heard.length} buyer{heard.length === 1 ? "" : "s"} gave feedback ({(Object.keys(INTEREST_WORD) as (keyof typeof INTEREST_WORD)[]).filter((k) => tally[k]).map((k) => `${tally[k]} ${INTEREST_WORD[k].toLowerCase()}`).join(", ")})
          </summary>
          <ul className="mt-2 flex flex-col divide-y divide-white/5 text-sm">
            {heard.map((s) => (
              <li key={s.id} className="flex flex-col gap-1 py-2">
                <span className="flex flex-wrap justify-between gap-2"><span>{INTEREST_WORD[s.interest!]}{s.rating && ` · ${s.rating}/5`}</span><span className="text-muted"><LocalTime ts={s.startsAt} opts={{ month: "short", day: "numeric" }} /></span></span>
                {s.feedback && <q className="text-ink/80">{s.feedback}</q>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Buyer names stay private; share this with the seller as is.</p>
        </details>
      )}
      <details className="rounded-card bg-surface-2 p-5">
        <summary className="min-h-11 cursor-pointer content-center text-sm text-accent">Book a showing here</summary>
        <div className="mt-3"><ScheduleShowing buyers={buyers} listings={[]} propertyId={p.id} /></div>
      </details>
    </section>
  );
}
