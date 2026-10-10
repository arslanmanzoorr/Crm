import type { Metadata } from "next";
import { Calculator, ChartNoAxesCombined, Clapperboard, FileImage, LayoutPanelTop, Pencil, Printer, Rotate3d, Send, TrendingUp } from "lucide-react";
import { approveListing, createCmaFromListing } from "@/lib/actions";
import Link from "next/link";
import { daysBetween } from "@/lib/deals";
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
import { dbEnabled, getDocuments, isOwnerOrAdmin, getLead, getLeadOptions, getPropertyHistory, getOffers, getOpenBuyers, getOpenHouses, getProperty, getFarmData, getMe, getLeadForm, getShowings, type OpenHouse } from "@/lib/db";
import { ScheduleShowing, ShowingItem } from "@/components/showing-controls";
import { SellerUpdateCard } from "@/components/seller-update-card";
import { ListingPromo } from "@/components/listing-promo";
import { SocialGraphic } from "@/components/social-graphic";
import { areaKey, PROMO_LABEL, type Promo } from "@/lib/farm";
import { checkUrl, PORTALS, syndicationSteps } from "@/lib/syndication";
import { feedGaps } from "@/lib/rental-feed";
import { Documents } from "@/components/documents";
import { sellerUpdate } from "@/lib/seller-update";
import { compareOffers, CONTINGENCIES, FINANCING, netOf, STATUS_LABEL } from "@/lib/offers";
import { matchListing, quickCapRate } from "@/lib/match";

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
        <span className="text-4xl font-light text-accent sm:text-5xl">{money(p.price)}{p.listingKind === "rent" && <span className="text-xl">/mo</span>}</span>
      </header>
      {!p.approved && <ApprovalBanner id={p.id} />}
      <div className="flex flex-wrap gap-2">
        <Chip>{p.beds} beds</Chip>
        <Chip>{p.baths} baths</Chip>
        <Chip>{p.sqft.toLocaleString()} sqft</Chip>
        {p.features.map((f) => <Chip key={f}>{f}</Chip>)}
      </div>
      {p.description && <p className="max-w-2xl text-ink/80">{p.description}</p>}
      {p.estRent ? <p className="text-sm text-muted">Rents for about {money(p.estRent)}/month · ≈{quickCapRate(p.price, p.estRent).toFixed(1)}% cap rate at standard assumptions</p> : null}
      {(p.tourUrl || p.floorPlanUrl) && (
        <div className="flex flex-wrap gap-2">
          {p.tourUrl && <a href={p.tourUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-5 text-sm hover:bg-surface-3"><Rotate3d aria-hidden className="size-4" /> Virtual tour</a>}
          {p.floorPlanUrl && <a href={p.floorPlanUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-5 text-sm hover:bg-surface-3"><LayoutPanelTop aria-hidden className="size-4" /> Floor plan</a>}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Link href={`/studio?property=${p.id}`} className="flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 font-medium text-on-light hover:bg-accent-strong">
          <Clapperboard aria-hidden className="size-4" /> Make video
        </Link>
        <Link href={`/publish?property=${p.id}`} className="flex min-h-11 items-center gap-2 rounded-full bg-surface-light px-5 font-medium text-on-light hover:bg-white">
          <Send aria-hidden className="size-4" /> Post to socials
        </Link>
        {p.listingKind !== "rent" && (<>
        <form action={createCmaFromListing} className="contents">
          <input type="hidden" name="property_id" value={p.id} />
          <button className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-5 hover:bg-surface-3"><ChartNoAxesCombined aria-hidden className="size-4" /> CMA</button>
        </form>
        <Link href={`/tools?tab=payment&price=${p.price}`} className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-5 hover:bg-surface-3">
          <Calculator aria-hidden className="size-4" /> Payment
        </Link>
        <Link href={`/tools?tab=invest&price=${p.price}${p.estRent ? `&rent=${p.estRent}` : ""}`} className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-5 hover:bg-surface-3">
          <TrendingUp aria-hidden className="size-4" /> Rental numbers
        </Link>
        </>)}
        <a href={`/properties/${p.id}/flyer`} target="_blank" rel="noopener" className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-5 hover:bg-surface-3">
          <FileImage aria-hidden className="size-4" /> Flyer
        </a>
        <Link href={`/properties/${p.id}/edit`} className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-5 hover:bg-surface-3">
          <Pencil aria-hidden className="size-4" /> Edit
        </Link>
      </div>
      {dbEnabled ? <PhotoManager propertyId={p.id} photos={p.photos ?? []} /> : <div className={`aspect-[21/9] rounded-card bg-gradient-to-br ${p.tone}`} />}
      <Suspense fallback={<Skeleton className="h-40 max-w-2xl" />}>
        <Buyers p={p} />
      </Suspense>
      {dbEnabled && p.approved && p.status !== "Under contract" && !(p.listingKind === "rent" && p.status === "Sold") && (
        <Suspense fallback={<Skeleton className="h-40 max-w-2xl" />}>
          <Promote p={p} />
        </Suspense>
      )}
      {dbEnabled && (
        <Suspense fallback={<Skeleton className="h-24 max-w-2xl" />}>
          <ListingDocs id={p.id} />
        </Suspense>
      )}
      {p.status !== "Sold" && <Marketplaces p={p} />}
      {dbEnabled && (
        <Suspense fallback={<Skeleton className="h-24 max-w-2xl" />}>
          <History p={p} />
        </Suspense>
      )}
      {dbEnabled && p.status !== "Sold" && (
        <Suspense fallback={<Skeleton className="h-40 max-w-2xl" />}>
          <WeeklyUpdate p={p} />
        </Suspense>
      )}
      {dbEnabled && p.listingKind !== "rent" && (
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
      <h2 id="buyers" className="text-xl">{p.listingKind === "rent" ? "Renters" : "Buyers"} who fit {ranked.length > 0 && <span className="text-muted">({ranked.length})</span>}</h2>
      {ranked.length === 0 ? (
        <p className="text-sm text-muted">No open {p.listingKind === "rent" ? "renter" : "buyer"} has this area and price in their search yet.</p>
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

/**
 * Just listed / open house / just sold: one note, sent to the buyers who fit (or, once sold, the leads in
 * the area), each logged on their timeline. Do-not-contact leads are never listed.
 */
async function Promote({ p }: { p: Property }) {
  const [openHouses, me] = await Promise.all([getOpenHouses(p.id), getMe()]);
  const next = openHouses.filter((o) => o.startsAt > new Date().toISOString()).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const kind: Promo = p.status === "Sold" ? "just_sold" : next ? "open_house" : "just_listed";
  let due: { id: string; name: string; email: boolean }[];
  if (kind === "just_sold") {
    const { people } = await getFarmData();
    due = people.filter((x) => !x.dnc && x.areas.some((a) => areaKey(a) === areaKey(p.area))).map((x) => ({ id: x.id, name: x.name, email: x.email }));
  } else {
    due = (await getOpenBuyers()).filter((b) => !b.dnc && matchListing(b, p)).slice(0, 25).map((b) => ({ id: b.id, name: b.name, email: !!b.consent_email }));
  }
  return (
    <section aria-labelledby="promote" className="flex max-w-2xl flex-col gap-3">
      <h2 id="promote" className="text-xl">{PROMO_LABEL[kind]} note</h2>
      <p className="text-sm text-muted">{due.length ? `For ${due.length} ${kind === "just_sold" ? `lead${due.length === 1 ? "" : "s"} in ${p.area}` : due.length === 1 ? "buyer who fits" : "buyers who fit"}. Log it on each one as you send it.` : kind === "just_sold" ? "No leads in this area yet." : "No open buyer fits this listing yet."}</p>
      <ListingPromo kind={kind} p={{ address: p.address, price: p.price, beds: p.beds, baths: p.baths, area: p.area, rent: p.listingKind === "rent" }} agent={me.name} whenIso={next?.startsAt} due={due} />
      <h3 className="mt-3 text-lg">Social post</h3>
      <SocialGraphic photo={p.cover} address={p.address} area={p.area} price={p.price} beds={p.beds} baths={p.baths} agent={me.name} initial={PROMO_LABEL[kind]} rent={p.listingKind === "rent"} />
    </section>
  );
}

/** Real estate portals: they get listings from the MLS, so this shows what's left and links to confirm it's live. */
function Marketplaces({ p }: { p: Property }) {
  if (p.listingKind === "rent") {
    const gaps = feedGaps({ ...p.rental, homeType: p.rental?.homeType, approved: p.approved, status: p.status });
    return (
      <section aria-labelledby="marketplaces" className="flex max-w-2xl flex-col gap-3">
        <h2 id="marketplaces" className="text-xl">Marketplaces</h2>
        <div className="flex flex-col gap-1 rounded-card bg-surface-2 p-5 text-sm">
          <p className="font-medium">Zillow, Trulia and HotPads (Zillow rentals feed)</p>
          <p className="text-muted">{gaps.length === 0 ? "In your team's rentals feed. Zillow picks up changes on its next read." : `Not in the feed yet. Needs: ${gaps.join(", ")}.`}</p>
          <Link href="/team#rental-feed" className="mt-1 w-fit text-accent underline">Feed settings</Link>
        </div>
        {gaps.length === 0 && (
          <a href={checkUrl("zillow.com", p.rental?.street ?? p.address, p.rental?.city ?? p.area)} target="_blank" rel="noreferrer" className="flex min-h-10 w-fit items-center rounded-full bg-surface-2 px-4 text-sm hover:bg-surface-3">Check it&apos;s live on Zillow</a>
        )}
      </section>
    );
  }
  const steps = syndicationSteps(p);
  return (
    <section aria-labelledby="marketplaces" className="flex max-w-2xl flex-col gap-3">
      <h2 id="marketplaces" className="text-xl">Marketplaces</h2>
      <p className="text-sm text-muted">Zillow, Realtor.com, Redfin and Homes.com take listings from your MLS, not from uploads. {p.mlsId ? `MLS #${p.mlsId}.` : ""}</p>
      {steps.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-card bg-surface-2 p-4 text-sm">
          {steps.map((s) => <li key={s} className="flex gap-2"><span aria-hidden className="text-score-2">•</span>{s}</li>)}
        </ul>
      )}
      <ul className="flex flex-col divide-y divide-white/5 overflow-hidden rounded-card bg-surface-2">
        {PORTALS.map((x) => (
          <li key={x.name} className="flex items-center justify-between gap-3 px-5 py-3">
            <span className="min-w-0"><span className="font-medium">{x.name}</span> <span className="block text-sm text-muted">{x.note}</span></span>
            <a href={checkUrl(x.domain, p.address, p.area)} target="_blank" rel="noreferrer" aria-label={`Check ${x.name} for this listing`} className="flex min-h-10 shrink-0 items-center rounded-full bg-surface-3 px-3.5 text-sm hover:bg-surface-1">Check</a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">Not showing up a few days after it&apos;s on the MLS? Ask your MLS whether your brokerage is opted in to syndication.</p>
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
  const [list, buyers, form] = await Promise.all([getShowings({ propertyId: p.id }), getLeadOptions(), getLeadForm()]);
  const now = new Date().getTime();
  const upcoming = list.filter((s) => Date.parse(s.endsAt) >= now && (s.status === "requested" || s.status === "confirmed"));
  const heard = list.filter((s) => s.interest).reverse();
  const tally = Object.fromEntries(Object.keys(INTEREST_WORD).map((k) => [k, heard.filter((s) => s.interest === k).length])) as Record<keyof typeof INTEREST_WORD, number>;
  return (
    <section aria-labelledby="showings" className="flex max-w-2xl flex-col gap-3">
      <h2 id="showings" className="text-xl">Showings {list.length > 0 && <span className="text-muted">({list.filter((s) => s.status !== "cancelled").length})</span>}</h2>
      {p.showingNotes && <p className="text-sm text-ink/80">Instructions: {p.showingNotes}</p>}
      {form && p.approved && p.status !== "Under contract" && p.status !== "Sold" && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <CopyLink url={`${process.env.SITE_URL ?? ""}/f/${form.id}/book?listing=${p.id}`} label="Copy booking link" />
          Buyers pick a time online; it lands here as a request.
        </div>
      )}
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

/** A ready-to-send weekly update for the seller, from the last 7 days on this listing. */
async function WeeklyUpdate({ p }: { p: Property }) {
  const now = new Date().getTime(), since = new Date(now - 7 * 86_400_000).toISOString();
  const [showings, openHouses, offers, seller] = await Promise.all([
    getShowings({ propertyId: p.id, from: since }), getOpenHouses(p.id), getOffers({ propertyId: p.id }), p.sellerId ? getLead(p.sellerId) : Promise.resolve(undefined),
  ]);
  const draft = sellerUpdate({
    firstName: seller?.name.split(" ")[0] ?? "there",
    address: p.address,
    daysOnMarket: p.createdAt ? Math.max(0, Math.floor((now - Date.parse(p.createdAt)) / 86_400_000)) : 0,
    showings: showings.filter((s) => s.status === "done" || s.status === "confirmed").filter((s) => Date.parse(s.startsAt) <= now).map((s) => ({ interest: s.interest, feedback: s.feedback })),
    openHouseVisitors: openHouses.flatMap((o) => o.visits).filter((v) => v.ts >= since).length,
    offers: offers.filter((o) => o.side === "seller").map((o) => ({ amount: o.amount, status: o.status })),
  });
  return (
    <section aria-labelledby="weekly" className="flex max-w-2xl flex-col gap-3">
      <h2 id="weekly" className="text-xl">Weekly seller update</h2>
      <SellerUpdateCard draft={draft} sellerId={p.sellerId ?? null} />
    </section>
  );
}

const STATUS_WORD: Record<string, string> = { Active: "Active", "Coming soon": "Coming soon", "Under contract": "Under contract", Sold: "Sold" };

/** Days on market, listing agreement expiry, and every status and price change. */
async function History({ p }: { p: Property }) {
  const events = await getPropertyHistory(p.id);
  const now = new Date().getTime();
  const dom = p.createdAt ? Math.max(0, Math.floor((now - Date.parse(p.createdAt)) / 86_400_000)) : null;
  const left = p.listingExpires ? daysBetween(new Date(now).toISOString().slice(0, 10), p.listingExpires!) : null;
  const usd = (v: string | null) => (v && !isNaN(Number(v)) ? money(Number(v)) : v ?? "");
  const line = (e: (typeof events)[number]) =>
    e.kind === "listed" ? `Listed: ${e.new?.replace(/ at (\d+(\.\d+)?)$/, (_, n) => ` at ${money(Number(n))}`)}`
    : e.kind === "price" ? `Price ${Number(e.new) < Number(e.old) ? "reduced" : "raised"} from ${usd(e.old)} to ${usd(e.new)}`
    : `${STATUS_WORD[e.old ?? ""] ?? e.old} → ${STATUS_WORD[e.new ?? ""] ?? e.new}`;
  return (
    <section aria-labelledby="history" className="flex max-w-2xl flex-col gap-3">
      <h2 id="history" className="text-xl">History</h2>
      <p className="-mt-2 text-sm text-muted">
        {dom !== null && `${dom} day${dom === 1 ? "" : "s"} on market`}
        {left !== null && <span className={left <= 30 ? "text-score-1" : ""}> · listing agreement {left < 0 ? `expired ${-left} days ago` : left === 0 ? "ends today" : `ends in ${left} days`}</span>}
      </p>
      {events.length > 0 && (
        <ol className="flex flex-col gap-0 border-l border-white/10 pl-5">
          {events.map((e, i) => (
            <li key={i} className="relative pb-3 text-sm last:pb-0">
              <span aria-hidden className={`absolute top-1.5 -left-[25px] size-2.5 rounded-full ${e.kind === "price" && Number(e.new) < Number(e.old) ? "bg-accent" : "bg-white/40"}`} />
              <p>{line(e)}</p>
              <p className="text-xs text-muted"><LocalTime ts={e.ts} opts={{ month: "short", day: "numeric", year: "numeric" }} /></p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

async function ListingDocs({ id }: { id: string }) {
  const docs = await getDocuments({ propertyId: id });
  return (
    <section aria-labelledby="docs" className="flex max-w-2xl flex-col gap-3">
      <h2 id="docs" className="text-xl">Documents</h2>
      <Documents parent={{ property_id: id }} docs={docs} />
    </section>
  );
}

/** Agents' new listings wait for an owner or admin before they're marketed. */
async function ApprovalBanner({ id }: { id: string }) {
  const admin = await isOwnerOrAdmin();
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface-2 p-4 text-sm">
      <span>Waiting for broker approval. It can&apos;t be posted to social media until it&apos;s approved.</span>
      {admin && (
        <form action={approveListing.bind(null, id)}>
          <button className="min-h-11 rounded-full bg-accent px-5 font-medium text-on-light hover:bg-accent-strong">Approve listing</button>
        </form>
      )}
    </div>
  );
}
