import type { Metadata } from "next";
import { Suspense } from "react";
import { Inbox } from "@/components/inbox";
import { getProperties, getThreads } from "@/lib/db";
import { matchListing } from "@/lib/match";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxPage() {
  return (
    <Suspense fallback={<div role="status" aria-label="Loading inbox" className="grid gap-4 lg:grid-cols-[320px_1fr]"><div className="flex flex-col gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div><Skeleton className="hidden h-[70dvh] lg:block" /></div>}>
      <Threads />
    </Suspense>
  );
}

async function Threads() {
  const [threads, listings] = await Promise.all([getThreads(), getProperties()]);
  // Each lead's best-fitting listings ride along, so a reply draft can suggest real homes instead of inventing them.
  for (const t of threads) if (t.lead) {
    t.homes = listings.flatMap((p) => { const m = matchListing({ type: t.lead!.type, budget: t.lead!.budget, areas: t.lead!.areas ?? [], preferences: t.lead!.preferences }, p); return m ? [{ p, m }] : []; })
      .sort((a, b) => b.m.score - a.m.score).slice(0, 3).map(({ p, m }) => ({ address: p.address, price: p.price, beds: p.beds, why: m.fits }));
  }
  return <Inbox threads={threads} />;
}
