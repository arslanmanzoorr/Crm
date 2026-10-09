import type { Metadata } from "next";
import { Clapperboard, Pencil, Send } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/lead-controls";
import { PhotoManager } from "@/components/photo-manager";
import { Chip, Skeleton } from "@/components/ui";
import { money } from "@/lib/data";
import { MatchReasons } from "@/components/match-reasons";
import type { Property } from "@/lib/data";
import { dbEnabled, getOpenBuyers, getProperty } from "@/lib/db";
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
        <Link href={`/properties/${p.id}/edit`} className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-5 hover:bg-surface-3">
          <Pencil aria-hidden className="size-4" /> Edit
        </Link>
      </div>
      {dbEnabled ? <PhotoManager propertyId={p.id} photos={p.photos ?? []} /> : <div className={`aspect-[21/9] rounded-card bg-gradient-to-br ${p.tone}`} />}
      <Suspense fallback={<Skeleton className="h-40 max-w-2xl" />}>
        <Buyers p={p} />
      </Suspense>
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
