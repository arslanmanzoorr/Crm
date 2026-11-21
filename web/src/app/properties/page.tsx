import type { Metadata } from "next";
import { CalendarDays, Plus, SlidersHorizontal, Users } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyDemo } from "@/components/empty-demo";
import { getOpenBuyers, getProperties, getShowings } from "@/lib/db";
import { money, type Property } from "@/lib/data";
import { LoadingCards } from "@/components/ui";
import { inputAuto } from "@/components/form-classes";
import { filterListings, matchListing } from "@/lib/match";

export const metadata: Metadata = { title: "Listings" };

export default function PropertiesPage({ searchParams }: PageProps<"/properties">) {
  return (
    <section className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-4xl font-light">Listings</h1>
        <Link href="/properties/new" className="flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-on-light hover:bg-accent-strong">
          <Plus aria-hidden className="size-4" /> Add listing
        </Link>
      </header>
      <Suspense fallback={<LoadingCards label="Loading listings" />}>
        <Listings searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const STATUSES = ["Active", "Coming soon", "Under contract", "Sold"] as const;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
const num = (v: string) => (Number(v) > 0 ? Number(v) : undefined);
// Same look as the lead filters (copied: leads.tsx is a client module).
const pill = (on: boolean) => `flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm transition duration-150 ${on ? "bg-surface-light text-on-light" : "bg-surface-2 text-ink/80 hover:text-accent-ink"}`;
const DAY = 864e5;
const short = (n: number) => (n >= 1e6 ? `$${+(n / 1e6).toFixed(2)}M` : money(n));

/** Listings plus this week's showings and open buyers, read at request time. */
async function load() {
  await connection();
  const now = Date.now();
  const [properties, showings, buyers] = await Promise.all([
    getProperties(),
    getShowings({ from: new Date(now).toISOString(), to: new Date(now + 7 * DAY).toISOString() }),
    getOpenBuyers(),
  ]);
  return { now, properties, showings, buyers };
}

async function Listings({ searchParams }: { searchParams: PageProps<"/properties">["searchParams"] }) {
  const [{ now, properties, showings, buyers }, sp] = await Promise.all([load(), searchParams]);
  if (!properties.length) return <EmptyDemo what="listings" />;

  const f = { kind: one(sp.kind), status: one(sp.status), maxPrice: one(sp.max), minBeds: one(sp.beds), minCap: one(sp.cap) };
  const more = { kind: f.kind || undefined, maxPrice: num(f.maxPrice), minBeds: num(f.minBeds), minCap: num(f.minCap) };
  const moreOn = Object.values(more).some(Boolean);
  // Status tabs count what the other filters leave, so the numbers always add up to what you'd see.
  const base = filterListings(properties, more);
  const shown = f.status ? base.filter((p) => p.status === f.status) : base;
  const count = (s: string) => base.filter((p) => p.status === s).length;
  const href = (status: string) => {
    const q = new URLSearchParams(Object.entries({ kind: f.kind, max: f.maxPrice, beds: f.minBeds, cap: f.minCap, status }).filter(([, v]) => v));
    return `/properties${q.size ? `?${q}` : ""}`;
  };

  const booked = new Map<string, number>();
  for (const s of showings) if (s.property && s.status !== "cancelled") booked.set(s.property.id, (booked.get(s.property.id) ?? 0) + 1);
  const open = buyers.filter((b) => !b.dnc);
  const fits = (p: Property) => (p.status === "Active" || p.status === "Coming soon" ? open.filter((b) => matchListing(b, p)).length : 0);

  const active = properties.filter((p) => p.status === "Active" && p.listingKind !== "rent");
  const pending = properties.filter((p) => p.status === "Under contract");
  const week = [...booked.values()].reduce((a, b) => a + b, 0);

  return (
    <>
      <dl className="grid grid-cols-3 gap-x-4 rounded-card bg-surface-2 p-4 sm:flex sm:gap-x-12 sm:p-6">
        <Stat label="For sale" value={String(active.length)} sub={short(active.reduce((n, p) => n + p.price, 0))} />
        <Stat label="Under contract" value={String(pending.length)} sub={short(pending.reduce((n, p) => n + p.price, 0))} />
        <Stat label="Showings" value={String(week)} sub="next 7 days" />
      </dl>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <nav aria-label="Listing status" className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto">
            <Link href={href("")} aria-current={!f.status ? "page" : undefined} className={pill(!f.status)}>All <span className="text-xs opacity-70">{base.length}</span></Link>
            {STATUSES.map((s) => (
              <Link key={s} href={href(s)} aria-current={f.status === s ? "page" : undefined} className={pill(f.status === s)}>
                {s} <span className="text-xs opacity-70">{count(s)}</span>
              </Link>
            ))}
          </nav>
        </div>
        <details open={moreOn} className="group">
          <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full px-1 text-sm text-muted hover:text-accent-ink [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal aria-hidden className="size-4" /> {moreOn ? "Filters on" : "More filters"}
          </summary>
          <form className="mt-2 flex flex-wrap items-center gap-2 rounded-card bg-surface-2 p-3" aria-label="Filter listings">
            {f.status && <input type="hidden" name="status" value={f.status} />}
            <select name="kind" defaultValue={f.kind} aria-label="For sale or rent" className={`${inputAuto} min-w-0`}>
              <option value="">Sale and rent</option><option value="sale">For sale</option><option value="rent">For rent</option>
            </select>
            <input name="max" type="number" min={0} step="any" inputMode="numeric" defaultValue={f.maxPrice} placeholder="Max price" aria-label="Max price" className={`${inputAuto} w-32`} />
            <input name="beds" type="number" min={0} step={1} inputMode="numeric" defaultValue={f.minBeds} placeholder="Min beds" aria-label="Minimum bedrooms" className={`${inputAuto} w-28`} />
            <input name="cap" type="number" min={0} step="any" inputMode="decimal" defaultValue={f.minCap} placeholder="Min cap %" aria-label="Minimum cap rate, percent" title="Estimated, from each listing's estimated rent" className={`${inputAuto} w-28`} />
            <button className="min-h-11 rounded-full bg-surface-3 px-4 text-sm hover:bg-surface-1">Apply</button>
            {moreOn && <Link href={href(f.status)} className="min-h-11 content-center px-2 text-sm text-muted hover:text-accent-ink">Clear</Link>}
          </form>
        </details>
        {f.minCap && <p className="text-sm text-muted">Cap rates are estimated from each listing&apos;s estimated rent.</p>}
      </div>

      {shown.length === 0 ? <p className="rounded-card bg-surface-2 p-8 text-center text-muted">No listings match. Try another status or loosen a filter.</p> : (
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {shown.map((p) => <li key={p.id}><ListingCard p={p} now={now} showings={booked.get(p.id) ?? 0} buyers={fits(p)} /></li>)}
        </ul>
      )}
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-3xl font-light tabular-nums sm:text-4xl">{value}</dd>
      <dd className="truncate text-sm text-muted tabular-nums">{sub}</dd>
    </div>
  );
}

/** Active is the default and goes unlabelled; every other status is labelled on the photo. */
const BADGE: Record<Property["status"], string> = {
  Active: "",
  "Coming soon": "bg-surface-light text-on-light",
  "Under contract": "bg-accent text-on-light",
  Sold: "bg-bg/70 text-muted",
};

function ListingCard({ p, now, showings, buyers }: { p: Property; now: number; showings: number; buyers: number }) {
  const [street, ...rest] = p.address.split(",");
  const city = rest.join(",").trim();
  const listed = p.createdAt ? Math.max(0, Math.floor((now - Date.parse(p.createdAt)) / DAY)) : null;
  const expires = p.listingExpires && p.status !== "Sold" ? Math.ceil((Date.parse(p.listingExpires) - now) / DAY) : null;
  const flag = p.approved === false ? "Waiting for approval" : expires !== null && expires <= 30 ? (expires < 0 ? "Agreement expired" : `Agreement ends in ${expires} day${expires === 1 ? "" : "s"}`) : null;
  return (
    <Link href={`/properties/${p.id}`} className="group grid grid-cols-[7rem_1fr] gap-3 rounded-card bg-surface-2 p-2.5 transition hover:bg-surface-3 sm:flex sm:flex-col sm:gap-0 sm:p-3">
      <div className="relative">
        {p.cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, resized on upload
          <img src={p.cover} alt="" loading="lazy" className="aspect-square w-full rounded-[14px] bg-surface-1 object-cover sm:aspect-[4/3]" />
        ) : (
          <div aria-hidden className={`grid aspect-square place-items-center rounded-[14px] bg-gradient-to-br sm:aspect-[4/3] ${p.tone}`}>
            <span className="rounded-full bg-bg/60 px-2.5 py-1 text-xs text-ink backdrop-blur">No photos</span>
          </div>
        )}
        {p.status !== "Active" && <span className={`absolute top-2 left-2 hidden rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur sm:inline-block ${BADGE[p.status]}`}>{p.status}</span>}
      </div>
      <div className="flex min-w-0 flex-col sm:px-1.5 sm:pt-3 sm:pb-1">
        <p className="flex items-baseline gap-2">
          <span className="text-xl font-medium tabular-nums">{money(p.price)}{p.listingKind === "rent" && <span className="text-sm text-muted">/mo</span>}</span>
          {p.status !== "Active" && <span className="text-xs text-muted sm:hidden">{p.status}</span>}
        </p>
        <h2 className="truncate font-medium group-hover:text-accent-ink">{street}</h2>
        <p className="truncate text-sm text-muted">{[p.area, city].filter(Boolean).join(" · ")}</p>
        <p className="mt-1 text-sm text-ink/80 tabular-nums">{p.beds} bd · {p.baths} ba · {p.sqft.toLocaleString()} sqft</p>
        <p className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-2 text-xs text-muted sm:mt-3 sm:border-t sm:border-line/10 sm:pt-3">
          {buyers > 0 && <span className="flex items-center gap-1 text-accent-ink"><Users aria-hidden className="size-3.5" />{buyers} buyer{buyers === 1 ? "" : "s"} match</span>}
          {showings > 0 && <span className="flex items-center gap-1"><CalendarDays aria-hidden className="size-3.5" />{showings} showing{showings === 1 ? "" : "s"} this week</span>}
          {listed !== null && p.status !== "Sold" && <span>{listed === 0 ? "Listed today" : `${listed} day${listed === 1 ? "" : "s"} listed`}</span>}
        </p>
        {flag && <p className="mt-1 text-xs font-medium text-score-2">{flag}</p>}
      </div>
    </Link>
  );
}
